import { createClient } from '@sanity/client'
import { defineQuery } from 'next-sanity'

/** The redirect map, fetched at build for `next.config.ts`.
 *
 * ## Why this file does not import from `src/sanity/`
 *
 * `next.config.ts` is evaluated before the application exists, by Next's own
 * config loader. `src/sanity/env.ts` *throws* when its environment variables
 * are missing — correct for the app, fatal here, because it would mean a fresh
 * clone could not run `next build` at all. So this module builds its own
 * minimal client and degrades deliberately instead.
 *
 * ## The two failure modes are deliberately different
 *
 * **Not configured** — no project id or dataset. A fresh clone before anyone
 * has filled in `.env.local`. Returns an empty map with a warning: there is no
 * dataset to ask, and refusing to build would make the template unusable.
 *
 * **Configured but unreachable** — Sanity is down, or the credentials are
 * wrong. **Throws, and fails the build.** The alternative is a deploy that
 * silently ships an empty redirect map, and `AGENTS.md` names losing search
 * equity at launch as the most damaging and most preventable failure in this
 * business. A delayed deploy is cheap; a launch that drops every old URL is
 * not. One retry first, so a two-second blip does not cost a deploy cycle.
 *
 * ## Redirects are read at build, not at request time
 *
 * A redirect published after a deploy does not take effect until the next one.
 * That is exactly what `studio/presentation.ts` tells the editor, and the two
 * strings must change together if this ever moves to middleware.
 */

/** WP4's contract, from `studio/schemaTypes/documents/redirect.ts`.
 *
 * `permanent` is derived here rather than stored, because the schema models
 * three outcomes and `next.config.ts` wants a boolean plus a third case it
 * cannot express at all. Always filter on `outcome` before reading
 * `destination`: switching a rule to "gone" hides the field in the Studio but
 * does not erase what was typed in it. */
export const REDIRECTS_QUERY = defineQuery(`*[_type == "redirect" && defined(source)]{
  source,
  destination,
  outcome,
  "permanent": outcome == "permanent"
}`)

export type RedirectRow = {
  source: string
  destination: string | null
  outcome: string | null
  permanent: boolean
}

export type RedirectMap = {
  /** 301 and 302 — `next.config.ts` `redirects()`. */
  moved: { source: string; destination: string; statusCode: 301 | 302 }[]
  /** 410 — rewritten to a route handler, because `redirects()` only emits 3xx. */
  gone: { source: string; destination: string }[]
}

/** `statusCode`, not `permanent`.
 *
 * Next's `permanent: true` emits **308**, and `false` emits **307**. Both are
 * correct HTTP and Google treats 308 exactly as it treats 301.
 *
 * They are still the wrong answer here, for a reason that has nothing to do
 * with crawlers. `studio/schemaTypes/documents/redirect.ts` shows the editor
 * "permanent (301)" and "temporary (302)" in the document list, every SEO tool
 * a client or their consultant runs reports in those numbers, and the whole
 * vocabulary of this part of the job is 301s. A site that says 308 where its
 * own CMS says 301 invites a question with no useful answer.
 *
 * The technical difference — 307/308 preserve the request method, 301/302
 * historically allowed a POST to become a GET — does not arise. These are
 * content URLs reached by GET.
 *
 * If this ever changes, `redirect.ts`'s preview strings change with it. */
const STATUS = { permanent: 301, temporary: 302 } as const

const EMPTY: RedirectMap = { moved: [], gone: [] }

/** Where `gone` rows are rewritten to.
 *
 * Under `/api/` on purpose. A top-level `/gone` would be shadowed by, and would
 * shadow, a page whose slug happened to be "gone" — static segments win over
 * `[slug]`, so that page would become permanently unreachable with nothing
 * reporting it. `/api/` is already disallowed in `robots.ts` and can never
 * collide with an editor's slug.
 *
 * A leading underscore is not an option: Next treats `_folder` as private and
 * does not route it at all. */
export const GONE_ROUTE = '/api/gone'

/** Vercel's ceiling on `next.config.ts` redirects. Past this the map has to
 *  move to middleware, which is a different design and a different session. */
const VERCEL_REDIRECT_LIMIT = 1024

async function fetchRows(): Promise<RedirectRow[]> {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET

  if (!projectId || !dataset) {
    console.warn(
      '[redirects] NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET is not ' +
        'set — building with no redirect map. Expected on a fresh clone; a problem ' +
        'anywhere else.',
    )
    return []
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2026-02-01',
    /* The CDN can be minutes behind, and the redirect published just before a
       deploy is the one most likely to be missing. */
    useCdn: false,
    perspective: 'published',
  })

  try {
    return await client.fetch<RedirectRow[]>(REDIRECTS_QUERY)
  } catch (firstError) {
    /* One retry. A transient network blip should not cost a deploy cycle; a
       real outage should still stop the build. */
    console.warn('[redirects] fetch failed, retrying once…')
    try {
      return await client.fetch<RedirectRow[]>(REDIRECTS_QUERY)
    } catch {
      throw new Error(
        'Could not read the redirect map from Sanity.\n\n' +
          'The build is stopped deliberately. Continuing would deploy a site with no ' +
          'redirects at all, which silently breaks every old URL — the failure that is ' +
          'hardest to notice and most expensive to undo.\n\n' +
          'Check status.sanity.io, then redeploy. Nothing needs fixing in the code.\n\n' +
          `Original error: ${firstError instanceof Error ? firstError.message : firstError}`,
      )
    }
  }
}

export async function getRedirectMap(): Promise<RedirectMap> {
  const rows = await fetchRows()
  if (rows.length === 0) return EMPTY

  const map: RedirectMap = { moved: [], gone: [] }

  for (const row of rows) {
    if (!row.source) continue

    if (row.outcome === 'gone') {
      map.gone.push({ source: row.source, destination: GONE_ROUTE })
      continue
    }

    /* A row with no destination cannot be a redirect. The schema blocks
       publishing one, so this is defence against a document written by a
       migration script rather than by an editor. */
    if (!row.destination) continue

    map.moved.push({
      source: row.source,
      destination: row.destination,
      statusCode: row.permanent ? STATUS.permanent : STATUS.temporary,
    })
  }

  const total = map.moved.length + map.gone.length
  if (total > VERCEL_REDIRECT_LIMIT) {
    console.warn(
      `[redirects] ${total} rules exceeds Vercel's limit of ${VERCEL_REDIRECT_LIMIT} for ` +
        'next.config.ts. Rules past the limit will not be applied. Move the map to ' +
        'middleware.',
    )
  }

  return map
}

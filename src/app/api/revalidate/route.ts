import { revalidatePath } from 'next/cache'
import type { NextRequest } from 'next/server'
import { parseBody } from 'next-sanity/webhook'

import { ROUTE } from '@/lib/routes'
import { submitToIndexNow } from '@/lib/seo/indexnow'

/** Sanity publish webhook: refresh the build-time files, then tell IndexNow.
 *
 * ## What this is *not* for
 *
 * Page content. `defineLive` in `src/sanity/lib/live.ts` handles that itself —
 * the Live Content API invalidates on its own and needs nothing here.
 *
 * What it *is* for is the handful of routes that are built once and then
 * frozen: the sitemap and the two `llms` files. Those use `client.fetch` with
 * `force-static`, deliberately, and without this webhook they would only change
 * on a deploy.
 *
 * **It does not update redirects.** Those are read from Sanity by
 * `next.config.ts` at build time, so a newly published redirect takes effect on
 * the next deploy — which is exactly what `studio/presentation.ts` tells the
 * editor. Do not add `revalidatePath` calls here hoping to change that; the
 * config is not re-evaluated at runtime, and a webhook that appears to work but
 * does not is worse than one that never claimed to.
 *
 * ## Setting it up on a new site
 *
 * 1. Generate a secret and set `SANITY_REVALIDATE_SECRET` in Vercel:
 *    `openssl rand -hex 32`
 * 2. sanity.io/manage → API → Webhooks → Create webhook
 *    - **URL:** `https://<site>/api/revalidate`
 *    - **Dataset:** production · **Trigger on:** create, update, delete
 *    - **Filter:** `_type in ["page", "post", "homePage", "siteSettings"]`
 *    - **Projection:** `{_type, "slug": slug.current}`
 *    - **Secret:** the value from step 1
 *
 * The projection matters. Without it Sanity posts the whole document, and this
 * route only needs two fields — a projection keeps a large article body out of
 * every webhook call.
 */

type WebhookBody = {
  _type?: string
  slug?: string
}

/** The build-time files, which are rebuilt on any content change. */
const GENERATED_PATHS = ['/sitemap.xml', '/llms.txt', '/llms-full.txt'] as const

/** Which page a changed document appears on.
 *
 * From `ROUTE`, like everything else that turns a document into an address —
 * a second mapping here would let the webhook revalidate a path the site does
 * not serve, which fails silently and looks like a caching bug. */
function documentPath(body: WebhookBody): string | null {
  switch (body._type) {
    case 'homePage':
      return ROUTE.home
    case 'page':
      return body.slug ? ROUTE.page(body.slug) : null
    case 'post':
      return body.slug ? ROUTE.post(body.slug) : null
    /* siteSettings has no page of its own — it changes the title template and
       the Organization data on every page. Nothing to revalidate individually;
       the generated files above pick up the change. */
    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  const { body, isValidSignature } = await parseBody<WebhookBody>(
    request,
    process.env.SANITY_REVALIDATE_SECRET,
  )

  /* `isValidSignature` is null when no secret is configured, which would mean
     an open endpoint anyone could use to force rebuilds. Treated as a failure
     rather than a warning. */
  if (isValidSignature !== true) {
    return Response.json(
      { revalidated: false, message: 'Invalid or missing webhook signature' },
      { status: 401 },
    )
  }

  if (!body?._type) {
    return Response.json(
      { revalidated: false, message: 'Webhook body has no _type — check the projection' },
      { status: 400 },
    )
  }

  for (const path of GENERATED_PATHS) revalidatePath(path)

  const path = documentPath(body)
  if (path) revalidatePath(path)

  /* IndexNow last, and its failures are swallowed by design. A search engine
     being unreachable must not fail the webhook — Sanity would retry, and the
     revalidation above has already happened. */
  const indexNow = await submitToIndexNow(path ? [path] : [])

  return Response.json({
    revalidated: true,
    type: body._type,
    path,
    indexNow: indexNow.status,
  })
}

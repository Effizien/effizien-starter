import { defineField, getPublishedId } from 'sanity'

import { DOCUMENT_TYPE } from '../../document-types'
import { isValueUniqueAcrossDocuments, STUDIO_API_VERSION } from './validation'

/** The web address, and the one thing that makes changing it safe.
 *
 * A slug is the only field an editor can change that silently destroys something
 * outside the CMS. Rename a live page and every inbound link, every bookmark and
 * every search result pointing at the old address returns a 404 — and nothing in
 * the Studio says so, because from the Studio's point of view the edit worked
 * perfectly. `AGENTS.md` calls losing search equity at launch the most damaging
 * and most preventable failure in this business. This field is where it happens.
 *
 * So this factory does three things a bare `type: 'slug'` does not:
 *
 *   1. Generates addresses that survive German, Nordic and accented titles —
 *      "Über uns" becomes `ueber-uns`, not `%C3%BCber-uns`.
 *   2. Refuses a duplicate address, in a message that names the document already
 *      using it. Two documents at one address means one of them is unreachable,
 *      and which one is not something we get to choose.
 *   3. Notices when the slug on an already-published document has changed and no
 *      redirect covers the old address — and says so in the Studio, at the moment
 *      the editor is making the change, rather than in a crawl report six weeks
 *      later.
 *
 * ── Why (3) warns rather than blocks ──────────────────────────────────────────
 *
 * Fixing a typo on a page published ten minutes ago that nothing links to yet is
 * a legitimate edit. An editor who cannot publish until they have created a
 * redirect for an address that never really existed learns to distrust the
 * message, and from there stops reading the ones that matter. The warning is
 * loud, names both addresses, tells them exactly what to create, and can be
 * overruled by the person who knows whether it matters.
 *
 * ── The pair of fields this makes ─────────────────────────────────────────────
 *
 * The redirect it asks for is an ordinary `redirect` document, which is what
 * makes this a closed loop the editor can actually complete: the warning names
 * the source and destination, and the Redirects list in the Studio is where they
 * type them. WP5 reads those rows into `next.config.ts`, so the fix takes effect
 * on the next deploy.
 */

/** Cap on a generated address. Long ones are not an SEO penalty; they wrap in
 *  search results, get truncated by chat clients, and stop being something a
 *  client can read down the phone. */
const SLUG_MAX_LENGTH = 96

/** Segments the Next.js app claims for itself. A page published at one of these
 *  never renders — the route handler wins — so this is an error, not advice.
 *  Add any top-level segment in `src/app` that is not driven by a slug. */
const RESERVED_SLUGS: readonly string[] = ['api']

/** Characters that must not be left to `normalize('NFD')`.
 *
 * Stripping the diacritic from "ü" gives "u", which is right for Swedish and
 * wrong for German, where the convention is "ue". This map takes the German
 * reading because that is the market this starter serves. A client in Sweden or
 * Denmark changes these lines once, before any content exists, and every address
 * generated afterwards follows.
 */
const TRANSLITERATIONS: Record<string, string> = {
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
  ß: 'ss',
  å: 'aa',
  æ: 'ae',
  ø: 'oe',
  œ: 'oe',
  ł: 'l',
  đ: 'd',
  ð: 'd',
  þ: 'th',
}

/** Title → address. Also the shape the format rule below enforces, so an address
 *  typed by hand and one made by the Generate button are held to one standard. */
export function toSlug(input: string, maxLength: number = SLUG_MAX_LENGTH): string {
  return input
    .toLowerCase()
    .replace(/[äöüßåæøœłđðþ]/g, (character) => TRANSLITERATIONS[character] ?? character)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '')
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type SlugFieldOptions = {
  /** Field the Generate button reads. Defaults to `title`. */
  source?: string
  /** Slug → the path the page is served at. Pass the matching entry from `ROUTE`
   *  in `studio/presentation.ts` — `ROUTE.post` for articles — so the help text,
   *  the duplicate-address message and the redirect lookup all describe the URL
   *  the site really uses. The default matches `ROUTE.page`. */
  pathFor?: (slug: string) => string
  /** Field group, if the document type uses them. Omit and the field sits with
   *  the ungrouped fields. */
  group?: string
  /** Types the address must be unique within. Defaults to the document's own
   *  type, which is right whenever one type owns one route. Widen it when two
   *  types share a route — `['page', 'landingPage']` both living at `/:slug`. */
  uniqueWithin?: readonly string[]
}

export function slugField(options: SlugFieldOptions = {}) {
  const {
    source = 'title',
    pathFor = (slug: string) => `/${slug}`,
    group,
    uniqueWithin,
  } = options

  return defineField({
    name: 'slug',
    title: 'Web address',
    type: 'slug',
    group,
    description:
      `Where this lives on the site: ${pathFor('about-us')}. Click Generate to ` +
      'build one from the title. Changing it after the page is live changes the ' +
      'address, so anything already linking to the old one needs a redirect.',
    options: {
      source,
      maxLength: SLUG_MAX_LENGTH,
      slugify: (input: string) => toSlug(input, SLUG_MAX_LENGTH),
      /* Sanity's built-in uniqueness check is deliberately switched off. It
         compares across every document type, so an article and a page may not
         share a name even when they live at different addresses, and it fails
         with "Slug is already in use" — which names neither the other document
         nor what to do about it. The rules below do the same job per type, and
         say which document is in the way. */
      isUnique: () => true,
    },
    validation: (rule) => [
      rule
        .required()
        .error(
          'This needs a web address before it can go live. Click Generate to build ' +
            'one from the title.',
        ),

      // Shape and reserved names. Both mean the address cannot work, and both
      // are fixable right here, so both block publishing.
      rule.custom((value) => {
        // An untouched field is `undefined` and belongs to `required()` above.
        // An *empty slug object* is a different thing and does get past
        // `required()` — it is what Generate leaves behind when the title is
        // made entirely of characters no address can carry.
        if (value === undefined || value === null) return true

        const current = value.current
        if (!current) {
          return (
            'There is no address here yet. If Generate produced nothing, the title ' +
            'contains no letters or numbers a web address can carry — type one by ' +
            'hand using lowercase letters, numbers and hyphens.'
          )
        }

        if (!SLUG_PATTERN.test(current)) {
          const suggestion = toSlug(current)
          if (!suggestion) {
            return (
              `"${current}" contains nothing a web address can carry. Addresses use ` +
              'only the letters a–z, numbers and hyphens, so a title in a ' +
              'non-Latin script needs an address written by hand.'
            )
          }

          return (
            `"${current}" cannot be used in a web address. Use lowercase letters, ` +
            'numbers and hyphens only — no spaces, capitals or punctuation. ' +
            `Click Generate and it becomes "${suggestion}".`
          )
        }

        if (RESERVED_SLUGS.includes(current)) {
          return (
            `Nothing can be published at ${pathFor(current)} — the site already uses ` +
            'that address for its own internal requests, so this page would never ' +
            'appear. Choose a different one.'
          )
        }

        return true
      }),

      // Duplicate address. Blocking: one of the two pages becomes unreachable.
      rule.custom(async (value, context) => {
        const current = value?.current
        const documentType = context.document?._type
        if (!current || !documentType) return true

        const unique = await isValueUniqueAcrossDocuments(
          current,
          { fieldPath: 'slug.current', types: uniqueWithin ?? [documentType] },
          context,
        )

        return (
          unique ||
          `Something else already lives at ${pathFor(current)}. Two pages cannot ` +
            'share one address — only one of them would ever be reachable, and which ' +
            'one is not something we get to choose. Pick a different address.'
        )
      }),

      // The published version of this document sits at a different address and
      // nothing redirects the old one. Advisory: loud, specific, overrulable.
      rule
        .custom(async (value, context) => {
          const current = value?.current
          const id = getPublishedId(context.document?._id ?? '')
          if (!current || !id) return true

          const client = context.getClient({ apiVersion: STUDIO_API_VERSION })

          // The *published* document, not the draft being edited: this asks
          // "what address are visitors using right now?".
          const previous = await client.fetch<string | null>(
            '*[_id == $id][0].slug.current',
            { id },
          )
          if (!previous || previous === current) return true

          const covered = await client.fetch<number>(
            'count(*[_type == $redirectType && source == $source])',
            { redirectType: DOCUMENT_TYPE.redirect, source: pathFor(previous) },
          )
          if (covered > 0) return true

          return (
            `This is live at ${pathFor(previous)}. Publishing this change moves it ` +
            `to ${pathFor(current)}, and every link, bookmark and search result ` +
            'pointing at the old address will hit a "page not found". Add a Redirect ' +
            `from ${pathFor(previous)} to ${pathFor(current)} and this notice goes ` +
            'away.'
          )
        })
        .warning(),
    ],
  })
}

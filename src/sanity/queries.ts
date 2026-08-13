import { defineQuery } from 'next-sanity'

/** Every GROQ query the site runs.
 *
 * One file because TypeGen reads queries out of `../src/**` and resolves
 * template interpolation only within the file it is reading — `SEO_PROJECTION`
 * below is interpolated into six queries, and moving it to a module of its own
 * would make every one of them generate as `unknown`. Split this file when it
 * gets unwieldy, but keep each projection beside the queries that use it.
 *
 * Queries must be wrapped in `defineQuery` or TypeGen cannot see them at all —
 * a plain template literal generates no type and fails silently.
 */

/** The SEO projection every routable document shares.
 *
 * This is WP4's contract, implemented (`studio/schemaTypes/objects/seo.ts`).
 * Read that file before changing a line of this one; each of the five decisions
 * below is load-bearing and three of them fail silently when reversed.
 *
 * **Fallbacks are here, not in the component.** Every field on the `seo` object
 * is an override, and a component doing `seo.title ?? page.title` has to be
 * repeated on every route and drifts on the one nobody remembers. Because the
 * shape is identical everywhere, `generateMetadata` is identical everywhere.
 *
 * **`noIndex` is `== "hidden"`, never `!= "visible"`.** A document saved before
 * the field existed has no value at all, and "no value" has to mean indexable.
 * The inverted test would quietly deindex every document written before the
 * field was added — a schema change that removes a live site from Google with
 * no error anywhere.
 *
 * **`excerpt` and `mainImage` do not exist on every type.** GROQ resolves an
 * unknown attribute to null rather than erroring, so `coalesce` simply falls
 * through on a `page`, which has neither. That is why one projection can serve
 * every routable type.
 *
 * The site-wide defaults — `siteSettings.description` and `socialImage` — are
 * *not* coalesced here. They are one value shared by every page, already
 * fetched once per request for the title template, and pulling them in would
 * make every document query carry a second subquery for a value the caller
 * already has. `buildMetadata` applies that layer, in one place, visibly.
 */
const SEO_PROJECTION = /* groq */ `"seo": {
    "title": coalesce(seo.title, title),
    "description": coalesce(seo.description, excerpt),
    "image": coalesce(seo.image, mainImage),
    "imageAlt": coalesce(seo.image.alt, mainImage.alt, title),
    "noIndex": seo.searchVisibility == "hidden",
    "canonicalUrl": seo.canonicalUrl
  }`

/* ── Site-wide ──────────────────────────────────────────────────────────────*/

/** Fetched by the root layout for the title template, and by the JSON-LD
 *  helpers for the Organization object. Direct id lookup rather than a type
 *  scan: singletons are pinned to an `_id` matching their type name, which is
 *  what `singletonDocumentId` in `studio/document-types.ts` guarantees. */
export const SITE_SETTINGS_QUERY = defineQuery(`*[_id == "siteSettings"][0]{
  siteName,
  description,
  socialImage,
  logo,
  socialLinks,
  contactEmail,
  contactPhone,
  postalAddress
}`)

/* ── Routable documents ─────────────────────────────────────────────────────*/

export const HOME_PAGE_QUERY = defineQuery(`*[_id == "homePage"][0]{
  _id,
  _type,
  title,
  ${SEO_PROJECTION}
}`)

export const PAGE_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]{
  _id,
  _type,
  title,
  "slug": slug.current,
  ${SEO_PROJECTION}
}`)

/** Marketing archetype only. On a catalogue or docs site the `post` type is not
 *  registered, this returns null, and `/blog/:slug` 404s — which is correct,
 *  because that clone has no blog. Delete the route with the archetype. */
export const POST_QUERY = defineQuery(`*[_type == "post" && slug.current == $slug][0]{
  _id,
  _type,
  title,
  "slug": slug.current,
  publishedAt,
  _updatedAt,
  excerpt,
  mainImage,
  author->{name, role},
  topics[]->{title},
  ${SEO_PROJECTION}
}`)

/* ── Static params ──────────────────────────────────────────────────────────*/

/** Bounded at 1,000, per the list-query rule in `.claude/rules/routes.md`.
 *
 * The bound is a real ceiling, not a formality: past it, pages beyond the first
 * thousand are still served, they are just rendered on demand instead of at
 * build. A site that crosses this line should move to on-demand ISR rather than
 * raising the number, because a build that statically renders ten thousand
 * pages is a twenty-minute deploy.
 *
 * Ordered by `_id` so the thousand that do get built are the same thousand on
 * every deploy — an unordered slice makes the build output differ run to run. */
export const PAGE_SLUGS_QUERY = defineQuery(
  `*[_type == "page" && defined(slug.current)] | order(_id) [0...1000].slug.current`,
)

export const POST_SLUGS_QUERY = defineQuery(
  `*[_type == "post" && defined(slug.current)] | order(_id) [0...1000].slug.current`,
)

/* ── Sitemap ────────────────────────────────────────────────────────────────*/

/** Everything that belongs in the sitemap, grouped by type.
 *
 * **Grouped rather than flattened, because `ROUTE` owns addresses.** GROQ could
 * concatenate a path here — `"/blog/" + slug.current` — and that string would
 * immediately be a second definition of where an article lives, free to drift
 * from `studio/presentation.ts` and `src/lib/routes.ts` with nothing failing.
 * The query returns slugs; `src/app/sitemap.ts` turns them into addresses with
 * the same functions every other route uses.
 *
 * **`!= "hidden"`, which is not the same shape as the `noIndex` projection.**
 * Both are correct. `noIndex` asks "did the editor hide this?" and must answer
 * no when the field is absent; the sitemap asks "may this be listed?" and must
 * answer yes when the field is absent. Verified with groq-js against documents
 * carrying no `seo` object at all: GROQ treats a null as not-equal, so legacy
 * documents survive the filter and appear in the sitemap.
 *
 * **Posts filter `publishedAt <= now()`.** `documents/post.ts` promises an
 * editor that a future date schedules an article. A sitemap listing a piece
 * that is not yet on the blog breaks that promise in the one place a search
 * engine is guaranteed to look.
 *
 * **Bounded at 5,000 per type.** Well under the 50,000-URL / 50MB limit for a
 * single sitemap file. A site that outgrows this needs `generateSitemaps` to
 * shard, not a bigger number here.
 */
export const SITEMAP_QUERY = defineQuery(`{
  "home": *[_id == "homePage" && seo.searchVisibility != "hidden"][0]{ _updatedAt },
  "pages": *[_type == "page"
      && defined(slug.current)
      && seo.searchVisibility != "hidden"]
    | order(_id) [0...5000]{ "slug": slug.current, _updatedAt },
  "posts": *[_type == "post"
      && defined(slug.current)
      && seo.searchVisibility != "hidden"
      && publishedAt <= now()]
    | order(_id) [0...5000]{ "slug": slug.current, _updatedAt }
}`)

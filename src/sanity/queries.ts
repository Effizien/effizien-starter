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
 *
 * ⚠️ **Never put a `/* … *\/` comment inside a query string.** GROQ's only
 * comment syntax is `//`. A block comment makes the query unparseable, and
 * TypeGen's response is to skip **the entire file** — it still exits zero, still
 * says "Successfully generated types", and simply reports one fewer file
 * processed. Every query here loses its result type at once, and the only
 * outward sign is that `sanityFetch` results stop being typed. Caught during
 * WP12 chunk 3 by noticing the file count drop from 2 to 1.
 *
 * The `/* groq *\/` markers below sit *outside* the template literals, where
 * they are ordinary JavaScript comments that editors use for syntax
 * highlighting. That is the difference.
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

/* ── Filters shared by everything that lists content publicly ───────────────*/

/** "May this document be listed publicly?"
 *
 * One constant, interpolated into every query that answers that question, so
 * the sitemap, `llms.txt` and the `articleList` block cannot drift into
 * disagreeing about what is public. Interpolation resolves within this file —
 * the reason everything lives in one module.
 *
 * **`!= "hidden"` is not the inverse spelling of the `noIndex` projection, and
 * both are right.** `noIndex` asks "did the editor hide this?" and must answer
 * no when the field is absent. This asks "may this be listed?" and must answer
 * yes when absent. Verified with groq-js: GROQ treats `null != "hidden"` as
 * true, so a document saved before the field existed is listed.
 *
 * **Declared here, above the page-builder projection, rather than beside the
 * sitemap.** These are interpolated at module evaluation, so a `const` used
 * before its definition is a temporal dead zone error rather than a hoisted
 * reference — the file would throw on import. WP12 chunk 5 moved them up when
 * `articleList` became the first consumer above the listing queries.
 */
const PUBLIC_FILTER = /* groq */ `seo.searchVisibility != "hidden"`

/** Articles filter on this as well.
 *
 * `documents/post.ts` promises an editor that a future date schedules a piece.
 * A sitemap, an llms.txt or a blog index advertising an article that is not yet
 * published breaks that promise in the places a reader and a machine both look.
 */
const PUBLISHED_FILTER = /* groq */ `publishedAt <= now()`

/* ── Page-builder sections ──────────────────────────────────────────────────*/

/** Enough of an image for `<SanityImage>` to render it properly.
 *
 * `asset->` is expanded for one reason: `metadata.lqip`, the base64 blur
 * placeholder `media-image.ts` asks Sanity to store. Dimensions are *not*
 * projected — they are encoded in the asset id and read from there
 * (`src/sanity/lib/asset-id.ts`), which keeps the payload smaller and works even
 * where the asset is not expanded.
 *
 * The spread keeps `role`, `alt` and `caption`, which are the accessibility
 * contract: a projection that listed fields by hand would drop `role` the first
 * time someone copied it, and a dropped `role` turns every decorative image into
 * one announced by a screen reader.
 */
const IMAGE_PROJECTION = /* groq */ `{
    ...,
    asset->{ _id, "metadata": metadata{ lqip } }
  }`

/** A `link`, with its internal destination resolved far enough to build a URL.
 *
 * `internalTarget->` expands the reference to the two fields `resolveHref` needs
 * — the document's type and its slug. It deliberately does **not** build the
 * path here: GROQ could concatenate `"/blog/" + slug.current` and that string
 * would immediately be a fourth definition of where an article lives, free to
 * drift from `ROUTE` with nothing failing. Same rule the sitemap query follows.
 */
const LINK_PROJECTION = /* groq */ `{
    ...,
    internalTarget->{ _type, "slug": slug.current }
  }`

/** Portable Text with its annotations and images resolved.
 *
 * Two things the default `content` projection would not give the renderer:
 * link annotations that can resolve to an address, and images carrying their
 * blur placeholder. Everything else passes through the spread, because the
 * renderer dispatches on `style`, `listItem` and `marks` and a hand-listed
 * projection would silently drop whichever one a future schema change adds.
 */
const RICH_TEXT_PROJECTION = /* groq */ `[]{
      ...,
      markDefs[]{
        ...,
        _type == "link" => ${LINK_PROJECTION}
      },
      _type == "mediaImage" => ${IMAGE_PROJECTION}
    }`

/** The articles an `articleList` block resolves to.
 *
 * ## Contributed by name, like every other archetype block
 *
 * `articleList` belongs to the marketing archetype. This branch is safe on a
 * catalogue or documentation site for the same reason the Studio's
 * `blocks/page-builder.ts` can list block names it does not import: a
 * conditional on `_type` simply never matches when no section has that type.
 * Nothing here needs to know which archetype is active.
 *
 * ## Both sources in one projection
 *
 * `select()` resolves the branch the editor chose. "Ones I choose" follows the
 * references in the editor's order; "the most recent" runs a fresh query, so
 * the list is still correct in two years with nobody editing the page — which
 * is what `article-list.ts` promises them.
 *
 * The automatic branch repeats the two filters every public listing uses. An
 * article scheduled for next week is not on the blog yet, and one hidden from
 * search is not something to link to from a page that is indexed.
 *
 * **Bounded at twelve, then trimmed in the component.** GROQ slice bounds are
 * safest as constants, and `limit` is editor-controlled — so the query takes a
 * fixed ceiling matching `SECTION_LIMIT.listItemsMax` and the block shows the
 * first `limit` of them. The bound is real either way: this is a list query, and
 * `.claude/rules/routes.md` allows no unbounded ones.
 *
 * `^` reaches the enclosing section, which is how the optional topic filter
 * reads a field of the block it belongs to.
 */
const ARTICLE_LIST_ARTICLES = /* groq */ `"articles": select(
        source == "selected" => articles[]->{
          _id,
          title,
          "slug": slug.current,
          publishedAt,
          excerpt,
          mainImage ${IMAGE_PROJECTION}
        },
        *[_type == "post" && defined(slug.current) && ${PUBLIC_FILTER}
            && ${PUBLISHED_FILTER}
            && (!defined(^.topic) || ^.topic._ref in topics[]._ref)]
          | order(publishedAt desc) [0...12]{
            _id,
            title,
            "slug": slug.current,
            publishedAt,
            excerpt,
            mainImage ${IMAGE_PROJECTION}
          }
      )`

/** The sections an editor composed, projected for the renderer.
 *
 * ## Every section contributes `heading`, including the ones nothing renders yet
 *
 * `headingOutline` decides the whole page's heading structure from the ordered
 * list of sections and whether each declares a heading. It has to see **all** of
 * them: if this projection returned only the block types that currently have a
 * renderer, a page whose first section is a `features` block would look to the
 * outline like it starts with whatever came next, and the `h1` would land on the
 * wrong section — or on the document title when a section had already claimed
 * it. So `_type`, `_key` and `heading` come back for every member, and the
 * per-type projections below only add what a specific renderer needs.
 *
 * The blocks without a conditional branch here — `features`, `faqs`,
 * `testimonials`, `callToAction` — are WP12 chunk 3, and `articleList` is chunk
 * 5. Until then they return their three shared fields, count towards the
 * outline, and render nothing.
 */
const PAGE_BUILDER_PROJECTION = /* groq */ `pageBuilder[]{
    _type,
    _key,
    heading,

    _type == "hero" => {
      lede,
      alignment,
      image ${IMAGE_PROJECTION},
      actions[]{
        _key,
        label,
        destination ${LINK_PROJECTION}
      }
    },

    _type == "textSection" => {
      content ${RICH_TEXT_PROJECTION}
    },

    _type == "features" => {
      intro,
      items[]{
        _key,
        heading,
        body,
        image ${IMAGE_PROJECTION},
        link{
          label,
          destination ${LINK_PROJECTION}
        }
      }
    },

    _type == "faqs" => {
      intro,
      items[]{
        _key,
        question,
        answer ${RICH_TEXT_PROJECTION}
      }
    },

    _type == "testimonials" => {
      intro,
      items[]{
        _key,
        quote,
        name,
        context,
        portrait ${IMAGE_PROJECTION}
      }
    },

    _type == "callToAction" => {
      body,
      actions[]{
        _key,
        label,
        destination ${LINK_PROJECTION}
      }
    },

    _type == "articleList" => {
      intro,
      source,
      limit,
      action{
        label,
        destination ${LINK_PROJECTION}
      },
      ${ARTICLE_LIST_ARTICLES}
    }
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
  ${PAGE_BUILDER_PROJECTION},
  ${SEO_PROJECTION}
}`)

export const PAGE_QUERY = defineQuery(`*[_type == "page" && slug.current == $slug][0]{
  _id,
  _type,
  title,
  "slug": slug.current,
  ${PAGE_BUILDER_PROJECTION},
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
  mainImage ${IMAGE_PROJECTION},
  author->{name, role},
  topics[]->{title},
  body ${RICH_TEXT_PROJECTION},
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
  "home": *[_id == "homePage" && ${PUBLIC_FILTER}][0]{ _updatedAt },
  "pages": *[_type == "page" && defined(slug.current) && ${PUBLIC_FILTER}]
    | order(_id) [0...5000]{ "slug": slug.current, _updatedAt },
  "posts": *[_type == "post" && defined(slug.current) && ${PUBLIC_FILTER}
      && ${PUBLISHED_FILTER}]
    | order(_id) [0...5000]{ "slug": slug.current, _updatedAt }
}`)

/* ── llms.txt ───────────────────────────────────────────────────────────────*/

/** The index behind `/llms.txt` — every public document, with a description.
 *
 * **Bounded at 1,000 per type, and that bound is doing something the sitemap's
 * is not.** A sitemap with a thousand URLs is normal. An `llms.txt` with a
 * thousand links is not a curated map of the site, which is the entire premise
 * of the format — it is a directory listing with extra steps. A site that
 * outgrows this needs an editorial signal for what belongs in the map, and that
 * is a content-model decision, not a bigger number here.
 *
 * There is deliberately **no "include in llms.txt" field** in the schema. A
 * second visibility switch beside `searchVisibility` is a state machine with
 * four combinations, two of which mean nothing — the argument
 * `documents/redirect.ts` already makes against an `isEnabled` field. */
export const LLMS_QUERY = defineQuery(`{
  "site": *[_id == "siteSettings"][0]{ siteName, description },
  "home": *[_id == "homePage" && ${PUBLIC_FILTER}][0]{
    title,
    "description": seo.description
  },
  "pages": *[_type == "page" && defined(slug.current) && ${PUBLIC_FILTER}]
    | order(title asc) [0...1000]{
      title,
      "slug": slug.current,
      "description": seo.description
    },
  "posts": *[_type == "post" && defined(slug.current) && ${PUBLIC_FILTER}
      && ${PUBLISHED_FILTER}]
    | order(publishedAt desc) [0...1000]{
      title,
      "slug": slug.current,
      publishedAt,
      "description": coalesce(seo.description, excerpt)
    }
}`)

/** Article bodies, for `/llms-full.txt`.
 *
 * **Articles only, and pages deliberately absent.** A `page` is composed of
 * page-builder sections, and turning those into Markdown here would be a second
 * rendering of the site — one that would immediately begin drifting from the
 * real one, so that the full-text file and the page itself would eventually
 * disagree about what the page says. That is the precise failure this whole
 * work package exists to prevent. Pages appear in `llms.txt` with their
 * descriptions; they gain full text when there is one renderer to derive it
 * from.
 *
 * **Bounded at 200.** Each body is the entire text of an article, so this is
 * the one query here whose payload is measured in megabytes rather than
 * kilobytes. */
export const LLMS_FULL_QUERY = defineQuery(`{
  "site": *[_id == "siteSettings"][0]{ siteName, description },
  "posts": *[_type == "post" && defined(slug.current) && ${PUBLIC_FILTER}
      && ${PUBLISHED_FILTER}]
    | order(publishedAt desc) [0...200]{
      title,
      "slug": slug.current,
      publishedAt,
      "description": coalesce(seo.description, excerpt),
      author->{ name },
      body
    }
}`)

import type { SanityImageSource } from '@sanity/image-url'
import type { Metadata } from 'next'

import { urlFor } from '@/sanity/lib/image'

import { absoluteUrl } from './site-url'

/** One function, every route.
 *
 * `generateMetadata` is identical on every page of the site because the query
 * hands it an identical shape — see `SEO_PROJECTION` in `src/sanity/queries.ts`.
 * Nothing in a route component decides what a title falls back to.
 *
 * Two layers of fallback exist, and they are different in kind. The *document*
 * layer (this page's SEO override, or this page's own title) is resolved in
 * GROQ, because it is per-document and would otherwise be rewritten on every
 * route. The *site* layer (the description every page shares when it has not
 * written its own) is resolved here, because it is one value the caller already
 * holds and coalescing it in GROQ would add a subquery to every document fetch.
 *
 * ## One set of fields, three networks
 *
 * The schema deliberately models one title and one description rather than an
 * Open Graph set, a Twitter set and a search set. Three fields saying the same
 * thing get filled in once and then diverge forever. Mapping the one set onto
 * all three is this function's job, and it is the whole reason the editor is
 * only asked once.
 */

/** The shape `SEO_PROJECTION` produces, for any routable document type.
 *
 * Written structurally rather than imported from `sanity.types.ts` so that one
 * function serves `page`, `post`, `homePage` and whatever an archetype adds,
 * without a union that grows every time a document type does. The generated
 * types satisfy this; if one stops doing so, `pnpm typecheck` says which route.
 */
export type SeoFields = {
  readonly title?: string | null
  readonly description?: string | null
  readonly image?: SeoImage | null
  readonly imageAlt?: string | null
  readonly noIndex?: boolean | null
  readonly canonicalUrl?: string | null
}

type SeoImage = {
  readonly asset?: { readonly _ref?: string } | null
  readonly hotspot?: unknown
  readonly crop?: unknown
  /** The site-wide default image carries its own description, written by the
   *  editor who uploaded it. The per-page one is projected separately as
   *  `imageAlt`, because it coalesces through several fields. */
  readonly alt?: string | null
}

/** The site-wide defaults a page falls back to. */
export type SiteDefaults = {
  readonly siteName?: string | null
  readonly description?: string | null
  readonly socialImage?: SeoImage | null
}

type BuildMetadataInput = {
  readonly seo: SeoFields | null | undefined
  readonly site: SiteDefaults | null | undefined
  /** Site-relative path this document is served at. Always from `ROUTE`. */
  readonly path: string
  /** `article` on a post, `website` everywhere else. */
  readonly type?: 'website' | 'article'
  /** The home page sets its own full title rather than having the site name
   *  appended to it — "Acme Roofing · Acme Roofing" is what the template would
   *  otherwise produce. */
  readonly titleIsAbsolute?: boolean
}

/** Every network renders the large share card at 1.91:1 — the same numbers
 *  `SEO_LIMITS.openGraphImage` holds in the Studio, where they are used to warn
 *  an editor whose upload is too small to fill it. */
const OG_IMAGE = { width: 1200, height: 630 } as const

/** Crop the editor's sharing image to the card, honouring the hotspot.
 *
 * The `as SanityImageSource` is the one cast in this module and it is doing real
 * work: the projection types `asset` as optional because a document may have no
 * image, while `urlFor` requires one. The guard above the cast is what makes it
 * true, and it is kept to a single line so the guarantee is visible beside it.
 */
function shareImageUrl(image: SeoImage | null | undefined): string | null {
  if (!image?.asset?._ref) return null

  return urlFor(image as SanityImageSource)
    .width(OG_IMAGE.width)
    .height(OG_IMAGE.height)
    .fit('crop')
    .auto('format')
    .url()
}

export function buildMetadata({
  seo,
  site,
  path,
  type = 'website',
  titleIsAbsolute = false,
}: BuildMetadataInput): Metadata {
  const title = seo?.title ?? undefined
  const description = seo?.description ?? site?.description ?? undefined

  /* The page's own sharing image, then the site-wide default. A page with
     neither gets no image tags at all rather than an empty one — a share card
     with a broken image reads worse than a share card with none. */
  const imageUrl = shareImageUrl(seo?.image) ?? shareImageUrl(site?.socialImage)

  /* The alt has to describe whichever image actually won, which is why this
     branches on the same condition the line above resolves. Falling back to the
     site name when the site-wide image is used would silently discard the
     description its editor wrote — and the person who uploaded that image is
     the one who knows what is in it. */
  const imageAlt = seo?.image?.asset?._ref
    ? (seo.imageAlt ?? title ?? undefined)
    : (site?.socialImage?.alt ?? site?.siteName ?? undefined)

  const images = imageUrl
    ? [{ url: imageUrl, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: imageAlt }]
    : undefined

  /* An editor's canonical override is already validated as an absolute https
     URL by the schema. Everything else builds its own from the site URL and the
     path — never omitted, never relative (AGENTS.md). */
  const canonical = seo?.canonicalUrl ?? absoluteUrl(path)

  /* `=== true` rather than a truthiness check or a `??` default. The projection
     emits a real boolean, but the polarity here is the one that removes a site
     from Google, so it is written to be unmistakable at a glance. */
  const noIndex = seo?.noIndex === true

  /* Absent, not `undefined`.

     Next merges route metadata into the layout's field by field, and a key that
     is *present* with the value `undefined` counts as the route having set it —
     which overrides `title.default` from the root layout with nothing at all.
     The symptom is a browser tab with no text in it on any document that has no
     title yet, which is every document on a freshly scaffolded site. Spreading
     the key in only when there is a value is what lets the layout's default and
     its `%s · Site name` template do their job. */
  const titleKey = title ? { title: titleIsAbsolute ? { absolute: title } : title } : {}
  const descriptionKey = description ? { description } : {}

  return {
    ...titleKey,
    ...descriptionKey,

    alternates: { canonical },

    /* `follow: true` on a hidden page is deliberate. "Do not list this page,
       but do follow its links" keeps the pages it links to discoverable;
       `nofollow` here would strand anything only reachable from it. */
    robots: noIndex ? { index: false, follow: true } : undefined,

    /* `title` and `description` are deliberately not repeated here. Next fills
       og: and twitter: from the resolved page title — template applied — when
       the block does not set its own, so restating them would only create a
       second copy able to drift from the first. */
    openGraph: {
      type,
      url: canonical,
      siteName: site?.siteName ?? undefined,
      images,
    },

    twitter: {
      /* Chosen once, here, rather than modelled as a field. The alternative —
         `summary` — renders a thumbnail, and a client picking between the two
         per page is a choice with no right answer that they will get wrong. */
      card: images ? 'summary_large_image' : 'summary',
      images,
    },
  }
}

import { stegaClean } from 'next-sanity'

import { ROUTE } from '@/lib/routes'

/** A `link` object from the schema, turned into an address.
 *
 *  `studio/schemaTypes/objects/link.ts` is the only destination type in the
 *  schema, so this is the only place the front end has to answer "where does
 *  this go". One resolver, one set of edge cases.
 *
 *  ## Addresses are derived, never restated
 *
 *  Every path here comes out of `ROUTE`. Writing `` `/blog/${slug}` `` in this
 *  file would immediately be a third definition of where an article lives —
 *  free to drift from `src/lib/routes.ts` and `studio/presentation.ts` with
 *  nothing failing. `tests/routes-mirror.test.ts` guards those two against each
 *  other; nothing would guard a third copy hidden in a component.
 *
 *  ## Why the values are cleaned
 *
 *  In draft mode `next-sanity` hides click-to-edit metadata inside the strings
 *  it returns, so `linkType` can carry invisible characters and compare unequal
 *  to `'internal'` — the link silently stops resolving, but only for the editor,
 *  only in Presentation, which is where they are looking when they decide
 *  whether the CMS works. `src/lib/page-builder/alignment.ts` makes this
 *  argument at length.
 *
 *  The rule this file follows: **any Sanity string used for a comparison or to
 *  build a URL goes through `stegaClean` first.** Keys beginning with `_` are
 *  exempt — the encoder never touches them — which is why `_type` is cleaned
 *  here anyway rather than relied upon. It costs nothing and removes a
 *  dependency on the encoder's internal denylist.
 *
 *  ## Unresolvable links return null rather than an empty href
 *
 *  A `product` on a catalogue site is a linkable type (`studio/archetype.ts`)
 *  that `ROUTE` has no entry for, because the catalogue archetype's routes are
 *  not built yet. An `<a href="">` for one of those is a link that looks live
 *  and navigates to the current page; returning null lets the caller render the
 *  text without an anchor, which is the honest failure. When catalogue routes
 *  arrive they are added to `ROUTE`, to `studio/presentation.ts`, and to the
 *  mirror test — in the same commit — and then to `SLUG_ROUTE` below.
 */

export type LinkTargetValue = {
  readonly _type?: string | null
  /** Projected as `"slug": slug.current`, not the raw slug object. */
  readonly slug?: string | null
}

export type LinkValue = {
  readonly linkType?: string | null
  readonly internalTarget?: LinkTargetValue | null
  readonly externalUrl?: string | null
  readonly opensInNewTab?: boolean | null
}

/** Document types whose address `ROUTE` builds from a slug. Fixed-route types
 *  are handled separately below — there is one home page and it is at `/`. */
const SLUG_ROUTE: Record<string, (slug: string) => string> = {
  page: ROUTE.page,
  post: ROUTE.post,
  docPage: ROUTE.docPage,
}

export const resolveHref = (link: LinkValue | null | undefined): string | null => {
  if (!link) return null

  const linkType = stegaClean(link.linkType)

  if (linkType === 'external') {
    const url = stegaClean(link.externalUrl)
    return typeof url === 'string' && url.length > 0 ? url : null
  }

  if (linkType !== 'internal') return null

  const target = link.internalTarget
  if (!target) return null

  const type = stegaClean(target._type)
  if (typeof type !== 'string') return null

  if (type === 'homePage') return ROUTE.home

  const build = SLUG_ROUTE[type]
  if (!build) return null

  const slug = stegaClean(target.slug)
  if (typeof slug !== 'string' || slug.length === 0) return null

  return build(slug)
}

/** True for a destination that leaves the site, which is what decides whether
 *  the anchor gets `rel="noopener noreferrer"` and whether `next/link`'s
 *  prefetching applies. Derived from the resolved address rather than from
 *  `linkType`, so a `mailto:` and a `tel:` are treated as what they are. */
export const isExternalHref = (href: string): boolean => !href.startsWith('/')

import type { DocumentLocationResolvers, DocumentResolver } from 'sanity/presentation'
import { defineDocuments, defineLocations } from 'sanity/presentation'

import { CATALOG_TYPE } from './catalog-types'

/** Where the catalogue lives on the site.
 *
 * Written once, here, and read by three things that must agree or the Studio
 * lies to the editor: `slugField`'s help text and its duplicate-address and
 * missing-redirect messages, the Presentation preview pane, and the app's own
 * routes.
 *
 * ## Why products and categories share one path
 *
 * `/products/pumps` is a category. `/products/xj-400` is a product. One segment,
 * two document types, and `slugField({uniqueWithin: [...]})` — which the base
 * library added for exactly this case — makes them compete for one address so
 * the collision is a validation error at the moment it is created rather than a
 * page that silently stops being reachable.
 *
 * The alternative, nesting products under their category
 * (`/products/pumps/xj-400`), is the more common design and the more expensive
 * one. Renaming a category would change the address of every product inside it,
 * and nothing would warn anybody: `slugField` checks the document being edited
 * for a missing redirect, and cannot know that forty other documents just moved.
 * `AGENTS.md` calls losing search equity at launch the most damaging and most
 * preventable failure in this business, so the archetype declines to build the
 * mechanism that causes it. A product's address does not depend on where it is
 * filed, which also means re-filing a product is free.
 *
 * The frontend cost is one route, `src/app/products/[slug]/page.tsx`, resolving
 * either type in one query and branching on `_type`.
 *
 * ## Localisation
 *
 * This is the seam the i18n module extends: localised routes are these
 * functions with a locale segment in front. Nothing else in the archetype knows
 * about URLs.
 */
export const CATALOG_ROUTE = {
  /** The catalogue itself: an ordinary `page` with the address "products", so
   *  the client can write an introduction above the grid and it needs no route
   *  of its own here. */
  index: '/products',
  product: (slug: string) => `/products/${slug}`,
  category: (slug: string) => `/products/${slug}`,
} as const

/** URL → document, for the Presentation tool.
 *
 * Spread into `mainDocuments` in `studio/presentation.ts` above the generic
 * `/:slug` rule. Two segments, so it cannot be swallowed by it in any case, but
 * keeping specific routes above the generic one keeps the file readable.
 *
 * One rule covers both types because they share the route. The filter uses GROQ
 * parameters rather than interpolation: the slug arrives from a URL an editor
 * can type into.
 */
export const catalogMainDocuments: DocumentResolver[] = defineDocuments([
  {
    route: '/products/:slug',
    /* Type names are interpolated into the filter rather than passed as a
       parameter. Presentation's `params` are typed `Record<string, string>` —
       a list is not a valid parameter value, so `$types` cannot carry one.
       Interpolation is safe here and only here: these are schema type names
       from `CATALOG_TYPE`, fixed at build time. The slug stays a parameter,
       because it arrives from a URL an editor can type into. */
    filter: `_type in ["${CATALOG_TYPE.product}", "${CATALOG_TYPE.productCategory}"] && slug.current == $slug`,
    params: ({ params }) => ({
      slug: params.slug ?? '',
    }),
  },
])

/** Document → URL, for the banner at the top of the document form.
 *
 * Types with no page of their own still get an entry. "No locations" reads to a
 * non-technical client as "this document is broken"; one sentence explaining
 * where the content actually surfaces costs a line and answers the question
 * they were about to ask.
 *
 * `select` paths are GROQ, not Studio preview paths, so they do not follow a
 * reference. Only fields on the document itself are selected here — the second
 * location is the catalogue index rather than the product's category page,
 * which would need a join.
 */
export const catalogLocations: DocumentLocationResolvers = {
  [CATALOG_TYPE.product]: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) => {
      if (!doc?.slug) {
        return {
          message: 'Give this product a web address and it can be previewed here.',
          tone: 'caution',
        }
      }
      return {
        locations: [
          {
            title: doc.title || 'Untitled product',
            href: CATALOG_ROUTE.product(doc.slug),
          },
          { title: 'Catalogue', href: CATALOG_ROUTE.index },
        ],
      }
    },
  }),

  [CATALOG_TYPE.productCategory]: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) => {
      if (!doc?.slug) {
        return {
          message: 'Give this category a web address and it can be previewed here.',
          tone: 'caution',
        }
      }
      return {
        locations: [
          {
            title: doc.title || 'Untitled category',
            href: CATALOG_ROUTE.category(doc.slug),
          },
          { title: 'Catalogue', href: CATALOG_ROUTE.index },
        ],
      }
    },
  }),

  [CATALOG_TYPE.productAttribute]: {
    message:
      'Specifications have no page of their own. This one appears as a row in the ' +
      'specification table of every product that records it, and as a filter on the ' +
      'catalogue if it is set to be one.',
  },

  [CATALOG_TYPE.productAttributeOption]: {
    message:
      'Allowed answers have no page of their own. This one appears in the ' +
      'specification table of every product it is set on, and as a checkbox in the ' +
      'catalogue filters.',
  },

  [CATALOG_TYPE.enquirySettings]: {
    locations: [
      {
        title: 'Every product page and the enquiry page',
        href: CATALOG_ROUTE.index,
        showHref: false,
      },
    ],
  },
}

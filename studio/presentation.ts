import type { DocumentLocationResolvers, DocumentResolver } from 'sanity/presentation'
import { defineDocuments, defineLocations } from 'sanity/presentation'

import { DOCUMENT_TYPE } from './document-types'

/** Presentation tool wiring — the two halves of "which document is this?".
 *
 * `mainDocuments` answers it forwards: the editor is looking at a URL in the
 * preview iframe — which document produced it? Without this the document pane
 * beside the preview stays empty and the editor has to go and find the document
 * by hand, which is the whole thing Presentation exists to avoid.
 *
 * `locations` answers it backwards: the editor is looking at a document — where
 * does it show up on the site? That is the banner at the top of the document
 * form, with a working link in it. Without it the banner reads "no locations",
 * which a non-technical client reasonably reads as "this page is broken".
 *
 * Click-to-edit inside the preview needs neither: it rides on stega-encoded
 * values in the query result, so it is the frontend's job — `sanityFetch`,
 * `<SanityLive />`, and `_key` used as the React key on every array item.
 *
 * Two things outside this file have to be true or the preview pane is blank:
 * the app must serve the route named in `previewUrl.previewMode.enable`
 * (`/api/draft-mode/enable`), and the app's origin must be a CORS origin on the
 * Sanity project *with credentials* — `pnpm cors` in `studio/` does localhost.
 */

/** Frontend routes.
 *
 * These must match the App Router segments in `src/app`. They are written once,
 * here, because a route that exists in Presentation but not in Next.js hands the
 * editor a preview link to a 404 — and a 404 in the preview pane looks exactly
 * like unpublished content.
 *
 * This is also the seam the i18n module extends. Localised routes are these
 * functions with a locale segment in front (`/${locale}/${slug}`); nothing else
 * in this file has to change.
 */
export const ROUTE = {
  home: '/',
  blogIndex: '/blog',
  page: (slug: string) => `/${slug}`,
  post: (slug: string) => `/blog/${slug}`,
  /* Docs archetype. Defined here rather than in the docs bundle so that the one
     module owning "what address does this document have" stays one module —
     the slug field, the duplicate-address check and the Presentation preview
     link all derive from it, and a second source would let them disagree. */
  docPage: (path: string) => `/docs/${path}`,
} as const

/** URL → document.
 *
 * Ordered most specific first. `/:slug` matches a single segment, so it cannot
 * swallow `/blog/hello-world` in any case, but keeping specific routes above the
 * generic one means the file still reads correctly when someone adds
 * `/services/:slug` below without thinking about ordering.
 *
 * Filters use GROQ parameters rather than interpolated strings: the slug comes
 * out of a URL the editor can type into, and concatenating that into a query is
 * how a preview tool grows an injection bug.
 */
export const mainDocuments: DocumentResolver[] = defineDocuments([
  {
    // Matched by type, not by the singleton's fixed `_id`. A draft of the home
    // page lives at `drafts.homePage`, so an `_id ==` filter would resolve the
    // published document and quietly show the editor stale content — which is
    // the opposite of what a preview is for.
    route: ROUTE.home,
    type: DOCUMENT_TYPE.homePage,
  },
  {
    route: `${ROUTE.blogIndex}/:slug`,
    filter: `_type == $type && slug.current == $slug`,
    params: ({ params }) => ({
      type: DOCUMENT_TYPE.post,
      slug: params.slug ?? '',
    }),
  },
  {
    // The blog index is an ordinary `page` with the slug "blog", so it needs no
    // route of its own — it falls through to this rule.
    route: '/:slug',
    filter: `_type == $type && slug.current == $slug`,
    params: ({ params }) => ({
      type: DOCUMENT_TYPE.page,
      slug: params.slug ?? '',
    }),
  },
])

/** Document → URL.
 *
 * Types with no page of their own still get an entry. One sentence explaining
 * *why* there is nothing to preview is worth more to a client than an empty
 * banner, and costs one line.
 *
 * Extra keys are harmless: a clone that deletes the blog leaves `post` here
 * pointing at a type that no longer exists, and Presentation simply never asks.
 */
export const locations: DocumentLocationResolvers = {
  [DOCUMENT_TYPE.homePage]: {
    locations: [{ title: 'Home', href: ROUTE.home }],
  },

  [DOCUMENT_TYPE.page]: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) => {
      if (!doc?.slug) {
        return {
          message: 'Give this page a web address and it can be previewed here.',
          tone: 'caution',
        }
      }
      return {
        locations: [{ title: doc.title || 'Untitled page', href: ROUTE.page(doc.slug) }],
      }
    },
  }),

  [DOCUMENT_TYPE.post]: defineLocations({
    select: { title: 'title', slug: 'slug.current' },
    resolve: (doc) => {
      if (!doc?.slug) {
        return {
          message: 'Give this article a web address and it can be previewed here.',
          tone: 'caution',
        }
      }
      return {
        locations: [
          { title: doc.title || 'Untitled article', href: ROUTE.post(doc.slug) },
          { title: 'Blog index', href: ROUTE.blogIndex },
        ],
      }
    },
  }),

  [DOCUMENT_TYPE.navigation]: {
    locations: [{ title: 'Every page on the site', href: ROUTE.home, showHref: false }],
  },

  [DOCUMENT_TYPE.siteSettings]: {
    locations: [{ title: 'Every page on the site', href: ROUTE.home, showHref: false }],
  },

  [DOCUMENT_TYPE.person]: {
    message: 'People appear on the articles they wrote, not on a page of their own.',
  },

  [DOCUMENT_TYPE.category]: {
    message:
      'Topics appear on the articles filed under them, not on a page of their own.',
  },

  [DOCUMENT_TYPE.redirect]: {
    message:
      'Redirects run before a page is rendered, so there is nothing to preview. ' +
      'They take effect on the next deploy.',
  },
}

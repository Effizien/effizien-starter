/** The routes every browser test runs against.
 *
 * One list, so adding a route to the site adds it to the accessibility gate
 * rather than requiring someone to remember to. Since WP12 these pages render
 * their page-builder sections, so the list scans real content rather than
 * shells.
 *
 * ## These paths depend on content that is not in this repository
 *
 * They resolve because documents exist in one Sanity dataset — eight pages, an
 * article, an author and the redirects. **None of that is versioned here.** A
 * clone of this starter gets every line of code and an empty dataset, and the
 * schema alone does not conjure a `/pricing`.
 *
 * That is deliberate rather than an oversight: a client's site will never want
 * this content, and a seed script maintained in step with the schema costs more
 * than it saves at this size. What matters is that the two failure modes are
 * told apart, which `dataset.ts` does:
 *
 * - **Nothing published at all** — a fresh scaffold. These routes are skipped
 *   with a reason, not failed. `/` is still scanned; it renders its own empty
 *   state and is still held to WCAG.
 * - **Something published, but a route here missing** — a deleted page, an
 *   edited slug, a broken query. Still a hard failure, and still loud.
 *
 * Revisit if a second site is ever scaffolded from this one and someone finds
 * themselves rebuilding content by hand to make CI pass. That is the point at
 * which a versioned seed earns its keep, and not before.
 */
export const SCANNED_ROUTES = [
  { path: '/', name: 'home' },
  { path: '/about', name: 'page with no SEO overrides' },
  { path: '/pricing', name: 'page with SEO overrides' },
  { path: '/thank-you', name: 'page hidden from search' },
  /* Added in WP12 chunk 2, and it should have been here sooner. This is the
     only seeded page whose first section declares no heading, so it is the only
     one where the `h1` comes from the document title rather than from a section
     — the branch of `headingOutline` that the obvious wrong implementation gets
     wrong. Every other page here exercises the same branch as the one above it.

     Its absence was not theoretical: a skipped heading level was introduced on
     this exact page while seeding, and the whole suite stayed green because
     nothing scanned it. */
  { path: '/why-flat-roofs-fail', name: 'page whose h1 comes from the title' },
  /* The blog index, and deliberately not a route of its own: it is an ordinary
     `page` with the slug "blog" whose builder holds an `articleList`. Scanned
     because it is the only page exercising a block contributed by the
     archetype rather than by the base library. */
  { path: '/blog', name: 'blog index' },
  /* Two pages where a block other than a hero is the *first* section, so that
     block claims the `h1` and everything inside it shifts up a level. On `/faq`
     the questions land at `h2` rather than `h3`; on `/products` the item names
     do. Nothing else in this list exercises that, and it is the branch of
     `headingOutline` most likely to be broken by a block deciding its own
     level. */
  { path: '/faq', name: 'page opening with an FAQ block' },
  { path: '/products', name: 'page opening with a list block' },
  { path: '/blog/how-long-a-flat-roof-lasts', name: 'article' },
] as const

/** Scanned separately: it answers 410, so a navigation to it is not a normal
 *  page load and Playwright treats the response differently. Still a page a
 *  person can land on, so it is still held to the same standard. */
export const GONE_ROUTE = { path: '/2019-catalogue', name: 'removed page (410)' } as const

/** The route whose page-builder holds a `faqs` block, and the ones that do not.
 *
 *  `FAQPage` markup is emitted by the block rendering, never by the route, so
 *  these two lists are what prove the coupling in both directions: present where
 *  the questions are on the page, absent everywhere else. Both depend on the
 *  seeded dataset in the same way every path in this file does. */
export const FAQ_ROUTES = [
  { path: '/pricing', name: 'page with an FAQ block below a hero' },
  /* A second one, deliberately. `FAQPage` is emitted by the block rendering
     rather than by the route, and one example cannot tell the difference
     between that and a rule hardcoded for `/pricing`. */
  { path: '/faq', name: 'page opening with an FAQ block' },
] as const

export const ROUTES_WITHOUT_FAQS = [
  '/',
  '/about',
  '/why-flat-roofs-fail',
  '/products',
] as const

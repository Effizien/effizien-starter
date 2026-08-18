/** The routes every browser test runs against.
 *
 * One list, so adding a route to the site adds it to the accessibility gate
 * rather than requiring someone to remember to. When WP12 renders the
 * page-builder sections, the pages below stop being shells and this list starts
 * earning its keep without changing.
 *
 * **These paths depend on the seeded dataset.** `docs/reviews/` and the WP5
 * handoff record what is in it: `siteSettings`, `homePage`, four pages covering
 * each visibility case, a person and one article. If the dataset is emptied,
 * every route here except `/` returns a 404 and the suite fails loudly — which
 * is the right failure, because an accessibility gate that silently scans
 * nothing is worse than no gate.
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
  { path: '/blog/how-long-a-flat-roof-lasts', name: 'article' },
] as const

/** Scanned separately: it answers 410, so a navigation to it is not a normal
 *  page load and Playwright treats the response differently. Still a page a
 *  person can land on, so it is still held to the same standard. */
export const GONE_ROUTE = { path: '/2019-catalogue', name: 'removed page (410)' } as const

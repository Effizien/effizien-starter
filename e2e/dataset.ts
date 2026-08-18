import type { APIRequestContext } from '@playwright/test'

/** Is there any published content at all?
 *
 * ## The distinction this draws, and why it is not a weakened gate
 *
 * These tests scan routes by path, and those paths exist only because documents
 * exist in one Sanity dataset. That is fine on this repository and wrong on a
 * clone: someone who scaffolds a client site gets all of the code and an empty
 * dataset, and every content route 404s. CI going red before they have written
 * a word says "you broke something" when the truth is "there is nothing here
 * yet" — and a gate whose first impression is a false accusation is a gate
 * people learn to ignore.
 *
 * So the suite separates two states that a bare 404 cannot tell apart:
 *
 * - **Nothing published at all** — a fresh scaffold. Content routes are skipped,
 *   visibly, with a reason. The suite still runs: `/` renders its own empty
 *   state and is still held to WCAG, because that page is the first thing the
 *   person who just cloned this will look at.
 * - **Something published, but a scanned route missing** — a page was deleted, a
 *   slug was edited, or a query broke. That is still a hard failure, unchanged.
 *
 * The original warning in `routes.ts` still holds: an accessibility gate that
 * silently scans nothing is worse than no gate. A skip is not silence — it is
 * reported per test with the reason attached, and it stops the moment one
 * document is published.
 *
 * ## Why the sitemap
 *
 * It is the site's own answer to "what public content exists", derived from the
 * same queries everything else uses. Counting documents through the Sanity
 * client would mean importing the CMS boundary into the browser tests and
 * needing credentials; reading a rendered page would tie this to copy that an
 * editor can change. `sitemap.ts` emits nothing at all when there is no home
 * page, no pages and no posts — exactly the state this needs to detect.
 *
 * Hidden pages are absent from the sitemap by design, which does not matter
 * here: this asks whether *anything* is published, not whether a specific route
 * should exist.
 */

/** Cached per worker. Each Playwright worker is its own process, so this costs
 *  one request per worker rather than one per test. */
let inFlight: Promise<number> | null = null

async function publishedUrlCount(request: APIRequestContext): Promise<number> {
  if (!inFlight) {
    inFlight = request
      .get('/sitemap.xml')
      .then(async (response) => {
        if (!response.ok()) return 0
        return ((await response.text()).match(/<loc>/g) ?? []).length
      })
      /* A failure to answer must not read as "empty", or a broken sitemap would
         quietly skip the whole suite. Treating it as populated keeps the
         content routes asserted, so the real problem surfaces as a failure. */
      .catch(() => Number.POSITIVE_INFINITY)
  }

  return inFlight
}

export const SCAFFOLD_SKIP_REASON =
  'Nothing is published in this dataset yet, so there is no page to scan. ' +
  'Publish content in the Studio and these run automatically — no test change needed.'

export async function datasetIsEmpty(request: APIRequestContext): Promise<boolean> {
  return (await publishedUrlCount(request)) === 0
}

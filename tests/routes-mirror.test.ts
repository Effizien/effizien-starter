import { describe, expect, it } from 'vitest'

import { ROUTE as APP_ROUTE } from '../src/lib/routes'
import { ROUTE as STUDIO_ROUTE } from '../studio/presentation'

/** The two copies of `ROUTE` must agree.
 *
 * `src/lib/routes.ts` mirrors `studio/presentation.ts` by hand, and both files
 * say so. The duplication is deliberate — the app and the Studio are separate
 * applications with separate dependency trees, and `presentation.ts` imports
 * `sanity/presentation`, so importing it into the Next.js build would drag the
 * entire Studio bundle across.
 *
 * What the duplication costs is that they can drift silently. `routes.ts:27`
 * records exactly this test as the fix: *"a test that reads both files and
 * asserts they produce the same string for the same input turns a silent drift
 * into a failing build."*
 *
 * **What drift actually breaks:** the Presentation tool builds the editor's
 * preview link from the Studio's copy, and the site serves the address built
 * from the app's. When they disagree, an editor clicks "preview" and gets a 404
 * — which looks exactly like unpublished content, so it is reported as a
 * content bug and investigated in the wrong place.
 *
 * This lives in `tests/` rather than beside `routes.ts` because it imports
 * across the app boundary; see the note in `vitest.config.mts`.
 */

describe('ROUTE — the app and the Studio agree', () => {
  it('exposes the same set of routes', () => {
    expect(Object.keys(APP_ROUTE).sort()).toEqual(Object.keys(STUDIO_ROUTE).sort())
  })

  it('agrees on the fixed routes', () => {
    expect(APP_ROUTE.home).toBe(STUDIO_ROUTE.home)
    expect(APP_ROUTE.blogIndex).toBe(STUDIO_ROUTE.blogIndex)
  })

  it.each([
    'about',
    'why-flat-roofs-fail',
    'a-slug-with-many-hyphens-in-it',
    '2019-catalogue',
  ])('agrees on page("%s")', (slug) => {
    expect(APP_ROUTE.page(slug)).toBe(STUDIO_ROUTE.page(slug))
  })

  it.each(['hello-world', 'how-long-a-flat-roof-lasts'])(
    'agrees on post("%s")',
    (slug) => {
      expect(APP_ROUTE.post(slug)).toBe(STUDIO_ROUTE.post(slug))
    },
  )

  it.each(['getting-started', 'guides/deploying'])('agrees on docPage("%s")', (path) => {
    expect(APP_ROUTE.docPage(path)).toBe(STUDIO_ROUTE.docPage(path))
  })

  /* Not a drift check — a check on the shape both copies have to keep. Every
     address the site serves is rooted, and a route that returned a relative
     path would be resolved against whatever page the visitor happened to be on. */
  it('produces rooted paths from every route', () => {
    const produced = [
      APP_ROUTE.home,
      APP_ROUTE.blogIndex,
      APP_ROUTE.page('x'),
      APP_ROUTE.post('x'),
      APP_ROUTE.docPage('x'),
    ]

    for (const path of produced) expect(path.startsWith('/')).toBe(true)
  })
})

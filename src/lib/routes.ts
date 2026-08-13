/** What address each document type has — the app's copy.
 *
 * ⚠️ THIS IS A MIRROR OF `ROUTE` IN `studio/presentation.ts`. Change one and you
 * must change the other, in the same commit.
 *
 * The Studio and the app are two independent applications with separate
 * dependency trees and separate tsconfigs (`exclude: ["studio"]`), so neither
 * can import from the other without dragging that app's dependencies into this
 * one's build. `studio/presentation.ts` imports `sanity/presentation`; pulling
 * it in here would put the entire Studio bundle into the Next.js graph.
 *
 * WP4 named this seam and named its failure: the Presentation tool's preview
 * link and the address the site really serves are allowed to disagree, and
 * nothing fails loudly when they do. An editor clicks "preview" and gets a 404
 * that looks exactly like unpublished content.
 *
 * Duplication was chosen over the two alternatives. Moving `ROUTE` here and
 * importing it from the Studio would put a schema-layer import — `slugField`
 * uses it, and `slugField` is in the extracted schema — across an app boundary,
 * which risks schema extraction for a cosmetic win. Re-exporting the Studio's
 * copy from here does the bundle damage described above.
 *
 * This is the same trade WP4 accepted for the two copies of `toSlug`, and it
 * gets the same treatment: both files carry the warning, and it is written down
 * in the handoff rather than discovered.
 *
 * **Revisit when WP6 brings tests.** A test that reads both files and asserts
 * they produce the same string for the same input turns a silent drift into a
 * failing build, which is all this duplication actually needs.
 */
export const ROUTE = {
  home: '/',
  blogIndex: '/blog',
  page: (slug: string) => `/${slug}`,
  post: (slug: string) => `/blog/${slug}`,
  /** Docs archetype. Present so the two copies stay identical even on a site
   *  that does not use it — a mirror with a deliberate gap in it is a mirror
   *  nobody trusts. */
  docPage: (path: string) => `/docs/${path}`,
} as const

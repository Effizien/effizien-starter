/** Editorial guardrails — the limits, and the policy that decides their severity.
 *
 *  ## Error or warning
 *
 *  A Sanity error blocks publishing. A warning shows a yellow note and lets the
 *  editor publish anyway. Choosing between them is a content decision, not a
 *  technical one, and getting it wrong is how a CMS becomes something the client
 *  resents and then routes around.
 *
 *  **Error** when publishing would break something the editor cannot see:
 *    - the page would not render, or would render blank (no title, no address,
 *      no sections)
 *    - two documents would fight over one URL
 *    - an accessibility guarantee would fail (an undescribed informative image,
 *      a link with no destination, a dropdown with no accessible name)
 *    - a menu would render as an empty bar on every page of the site
 *
 *  **Warn** when the content will render correctly but badly:
 *    - a title Google will truncate
 *    - alternative text long enough to become a wall of speech
 *    - eleven top-level menu entries nobody reads past the fifth of
 *
 *  The editor knows things the schema does not. A legal notice genuinely might
 *  need a 90-character title. Blocking that publish teaches the client that the
 *  Studio is an obstacle, and the next thing they learn is who to ask to have the
 *  validation removed. Warnings survive handover; overzealous errors do not.
 *
 *  **Never error on something the editor cannot fix from inside this document.**
 *  A missing translation, an unset environment variable, a failed deploy: none of
 *  those belong in a validation rule, because the only available response is to
 *  give up.
 *
 *  **Every message says why, and what to do.** "Required" tells an editor that
 *  they have done something wrong and nothing else. Each message here names the
 *  consequence — what a visitor or a search engine sees — and the next action.
 *
 *  ## Where the numbers come from
 *
 *  They are soft limits attached to warnings, so approximately right is right
 *  enough. They live in one object so that "how long can a title be" has one
 *  answer across the whole schema, and so a client with a different house style
 *  changes it in one place rather than in nine validation rules.
 *
 *  **Slug length is not here.** It lives in `./slug-field.ts` beside the rest of
 *  the slug rules — the generator, the format check, the duplicate check and the
 *  redirect warning are one system, and splitting its one number out from it is
 *  what let this module grow a second, divergent copy of the whole thing. See
 *  `docs/reviews/wp4-content-model.md`.
 */
export const LIMIT = {
  /** Search results truncate around here. Not a hard cap — see the policy above. */
  pageTitle: 70,
  /** Google's desktop description snippet. Also the cap on the site-wide default
   *  description, because it is used in exactly the same place. */
  metaDescription: 155,
  /** Screen readers do not pause inside alternative text, so past this it is one
   *  unbroken sentence. Longer explanations belong in a caption or the page. */
  altText: 125,
  /** A caption longer than this is a paragraph that has been put in the wrong
   *  place. */
  caption: 200,
  /** Appended to every page title, so every character here is a character of the
   *  page title that search results cut off. */
  siteName: 60,
  /** Menu labels are laid out side by side; long ones wrap or push their
   *  neighbours off the row. */
  navigationLabel: 32,
  /** Top-level menu entries before a menu stops being scannable. */
  headerEntries: 7,
  /** Links inside one dropdown or one footer column. */
  groupLinks: 8,
  /** Footer columns and standalone footer links, combined. */
  footerEntries: 8,
  /** Social icons in a footer row before it reads as clutter. */
  socialProfiles: 8,
} as const

/* `STUDIO_API_VERSION` and `hasText` are owned by `./validation`. Both were
   defined here as well — identical implementations, written independently — and
   two copies of a predicate is two things to keep in step for no benefit.
   Re-exported so the files importing them from this module keep working.

   `STUDIO_API_VERSION` is pinned deliberately and matched to the app's
   `src/sanity/env.ts`: an API version is a date, and letting it float means
   Sanity can change what a validation query returns without a line of this
   repository changing. */
export { hasText, STUDIO_API_VERSION } from './validation'

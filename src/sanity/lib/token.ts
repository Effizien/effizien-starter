import 'server-only'

/** The Sanity read token.
 *
 * ⚠️ THIS TOKEN MUST BE VIEWER-SCOPED, NEVER EDITOR OR DEPLOY.
 *
 * next-sanity's Live Content API sends this token to the BROWSER when draft mode
 * is enabled, so an authenticated editor can see unpublished content. That is the
 * documented design, and it is safe only because a Viewer token can read and
 * nothing else. Issue an Editor or Deploy token here and you have handed every
 * draft-mode visitor the ability to write to your dataset.
 *
 * The `server-only` import above makes the mistake of importing this into a
 * client component a build error rather than a leak.
 *
 * Create the token at https://www.sanity.io/manage → API → Tokens, with the
 * Viewer role. */

export const token = process.env.SANITY_API_READ_TOKEN

if (!token) {
  /* A warning, not a throw: the site renders published content perfectly well
     without it. Only draft mode and Visual Editing need the token, so a missing
     one should not stop a production build of a live site. */
  console.warn(
    '[sanity] SANITY_API_READ_TOKEN is not set — draft mode and Visual Editing are disabled.',
  )
}

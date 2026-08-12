/** Where search results and share cards actually get cut off — and the policy
 *  for which of these numbers is allowed to stop a client publishing.
 *
 * ── Where the numbers come from ───────────────────────────────────────────────
 *
 * Google truncates by pixel width, not character count: roughly 580px for a
 * desktop title and around 920px for a snippet, less on a phone. Characters are
 * the only unit a text field can count, so every number here is a conversion. A
 * title of 60 narrow characters survives where 55 wide ones do not. Google also
 * rewrites the displayed title outright for a large share of results regardless
 * of what we send it.
 *
 * ── Warning or error ──────────────────────────────────────────────────────────
 *
 * A Sanity *error* blocks publishing. A *warning* shows a yellow note and lets
 * the editor publish anyway. Which one a rule uses is a content decision, and
 * getting it wrong is how a CMS becomes something the client resents.
 *
 * **Warn** when the page will render correctly but render badly, or when the
 * rule is our approximation of a system we do not control. Every length limit in
 * this file is one or the other. A legal notice genuinely might need a
 * 90-character title; blocking that publish teaches the client that the Studio
 * invents rules, and the next thing they learn is who to ask to switch the
 * validation off. Warnings survive handover. Overzealous errors do not — they
 * get removed, taking the useful rules with them.
 *
 * **Error** only when publishing would produce something broken or ambiguous
 * inside a system we *do* control, and the editor can fix it from this document:
 * a missing or duplicate web address, a redirect loop, a canonical URL that is
 * not a complete address, a sharing image with no alternative text.
 *
 * `hard` below is a third thing, and the reason it errors is not length. It is
 * the shape of a paragraph pasted into a one-line box — a mistake rather than a
 * trade-off, and one whose only symptom otherwise is a search result the client
 * never looks at. It is set far above the point of truncation so it can only
 * fire on genuine misuse, never on an editor who wanted a long title.
 */
export const SEO_LIMITS = {
  title: {
    /** Past this a desktop search result usually ends in an ellipsis. */
    ideal: 60,
    /** Past this the field is being used for something that is not a title. */
    hard: 120,
  },
  description: {
    /** Under this Google is more likely to discard it and write its own snippet
     *  out of the page body — which is the outcome writing a description was
     *  meant to prevent. */
    min: 50,
    /** Past this the snippet is cut mid-sentence on desktop. Mobile cuts
     *  earlier still, nearer 120, which is the real argument for front-loading
     *  rather than for a lower limit. */
    ideal: 155,
    /** Past this, someone has pasted the opening paragraph in. */
    hard: 320,
  },
  /** Facebook, LinkedIn, X, Slack, WhatsApp and iMessage all render the large
   *  share card at 1.91:1. Smaller than this and the network upscales it, which
   *  is the blurry-logo look every client notices the day after launch. */
  openGraphImage: {
    width: 1200,
    height: 630,
  },
} as const

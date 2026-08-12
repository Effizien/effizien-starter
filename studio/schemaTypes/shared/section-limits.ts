/** Soft limits for page-builder sections.
 *
 *  Separate from `LIMIT` in `editorial-guardrails.ts` on purpose: that file
 *  holds document-level numbers (page titles, slugs, menu labels) and is owned
 *  by the base content model. These are section-level numbers, owned by the
 *  block library. Both follow the same policy, which is written out in full in
 *  `editorial-guardrails.ts` and worth repeating in one line here:
 *
 *  **error** when publishing breaks something the editor cannot see;
 *  **warn** when it will render correctly but badly.
 *
 *  Every number below is attached to a warning except the two marked otherwise,
 *  so being approximately right is enough. A client with a different house style
 *  changes them here, once.
 */
export const SECTION_LIMIT = {
  /** A section heading is scanned, not read. Past this it stops being a signpost
   *  and starts being a sentence. */
  heading: 80,
  /** The paragraph that introduces a section. Longer than this and it is the
   *  section, not the introduction to it — use a text section. */
  intro: 240,
  /** The name of one item in a list of items. These sit next to each other, so
   *  an outlier wrecks the alignment of the whole set. */
  itemHeading: 60,
  /** Supporting copy for one item. */
  itemBody: 320,
  /** A pull quote past this length stops being quotable. */
  quote: 320,
  /** Words on a button. "Book a consultation", not "Click here to book your free
   *  no-obligation consultation today". */
  actionLabel: 40,
  /** **Enforced as an error.** More than two choices at one decision point
   *  measurably reduces the number of people who take any of them, and the
   *  design only has room for a primary and a secondary. */
  actions: 2,
  /** **Enforced as an error.** One item is a statement, not a list. */
  listItemsMin: 2,
  /** Past this, a list is a page of its own. */
  listItemsMax: 12,
} as const

/** Soft limits for the documentation archetype.
 *
 *  Separate from `LIMIT` in `shared/editorial-guardrails.ts` (document-level
 *  numbers, owned by the base content model) and `SECTION_LIMIT` in
 *  `shared/section-limits.ts` (page-builder numbers, owned by the block library)
 *  for the reason those two are separate from each other: an archetype is
 *  deleted whole when a client does not use it, and a number that lives in a
 *  shared file cannot be deleted with it.
 *
 *  Same policy as the rest of the schema, restated in one line because it is the
 *  thing most often got wrong:
 *
 *  **error** when publishing breaks something the editor cannot see;
 *  **warn** when it will render correctly but badly.
 *
 *  Every number here is attached to a warning except the two marked otherwise,
 *  so approximately right is right enough. A client whose manual is genuinely
 *  shaped differently changes them here, once, rather than in nine rules.
 */
export const DOCS_LIMIT = {
  /** The one-line summary. It is shown under the title in the section index and
   *  used as the search-result description, both of which are one line. */
  summary: 200,

  /** A sidebar group heading. These sit in a narrow column, so a long one wraps
   *  to three lines and pushes the pages below it off the first screen. */
  sectionTitle: 40,

  /** Groups in the sidebar. Past this the sidebar is itself a thing that has to
   *  be navigated, which is the problem it was there to solve. */
  sections: 12,

  /** Pages under one sidebar group. Past this the group wants splitting — a
   *  reader scanning a list this long has already given up and used search. */
  pagesPerSection: 20,

  /** "See also" entries. More than a handful is not a list of related pages, it
   *  is a second navigation menu with no ordering logic. */
  relatedPages: 4,

  /** Lines in one code sample. Past this it is a file, and a file belongs in the
   *  repository with a link to it — nobody reads sixty lines of code in a web
   *  page, and nobody can copy it accurately either. */
  codeLines: 60,

  /** How long a page goes without being checked before the Studio starts calling
   *  it stale. Not a validation rule — it only changes how the page describes
   *  itself in a list. See `lastReviewedAt` in `doc-page.ts`. */
  staleAfterMonths: 12,

  /** **Enforced as an error.** A sidebar group with nothing under it renders as
   *  a heading that leads nowhere. */
  pagesPerSectionMin: 1,
} as const

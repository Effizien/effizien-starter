/** Soft limits for the catalogue.
 *
 * Separate from `LIMIT` (document-level, base content model) and
 * `SECTION_LIMIT` (page-builder sections) for the same reason those two are
 * separate from each other: each belongs to the module that owns the fields it
 * governs, so removing the archetype removes its numbers with it.
 *
 * The policy is the one written out in full in `shared/editorial-guardrails.ts`,
 * and it is worth one line here:
 *
 *   **error** when publishing breaks something the editor cannot see;
 *   **warn** when it will render correctly but badly.
 *
 * Every number below is attached to a warning except the two marked otherwise,
 * so being approximately right is enough.
 */
export const CATALOG_LIMIT = {
  /** A product name sits in a card, a breadcrumb and a search result. */
  productName: 90,
  /** Article numbers come from an ERP. Past this something else has been
   *  pasted in — usually a description. */
  articleNumber: 40,
  /** The sentence under a product in a listing, and the fallback search
   *  description when the SEO tab is empty. */
  summary: 200,
  /** Photographs of one product. Past this the gallery is an archive. */
  images: 12,
  /** Rows in one product's specification table. Past this nobody reads it and
   *  the interesting rows are buried — the fix is fewer, better rows. */
  specifications: 40,
  /** Rows that may differ on a single variant. A variant differing in twenty
   *  ways is a product. */
  variantSpecifications: 12,
  /** Variants of one product. */
  variants: 24,
  /** Downloads on one product. */
  downloads: 12,
  /** The label on a specification row, shown in the left column of the table. */
  attributeLabel: 60,
  /** One allowed answer. These sit in a filter list side by side. */
  optionLabel: 60,
  /** The machine key used in filter web addresses. */
  key: 48,
  /** Sentence explaining a specification to a visitor who does not know the
   *  abbreviation. */
  attributeExplanation: 200,
  /** Products a page-builder section may list by hand. */
  listedProducts: 12,
  /** **Enforced as an error.** Categories nest one level. A third level is
   *  unreachable on a phone and unbrowsable everywhere else. */
  categoryDepth: 2,
  /** Words on the enquiry button. */
  actionLabel: 32,
  /** The message shown after an enquiry is sent. */
  successMessage: 300,
} as const

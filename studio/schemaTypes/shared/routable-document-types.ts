/** The document types that have a URL of their own on the public site.
 *
 * One list, and everything that lets an editor point at a page reads it: the
 * `link` object's reference picker, the rich-text link annotation, and any
 * archetype block that offers a "read more" target. A client site that adds a
 * routable document type adds it here, once.
 *
 * ## The contract
 *
 * Every type named here must
 *   1. be **registered** in `schemaTypes/index.ts` — a `reference` pointing at
 *      a type the schema does not define is a Studio-level error, not a quiet
 *      no-op, so removing the blog from a clone means removing `post` from both
 *      places;
 *   2. have a **`title`** field, because the reference picker and every link
 *      preview in the Studio show it; and
 *   3. resolve to **one URL the frontend can construct** — from `slug.current`
 *      when `hasPath` is true, from a fixed route when it is false.
 *
 * ## Why the base library lists only two
 *
 * `homePage` and `page` are the only routable types every archetype has.
 * Articles, products and documentation pages arrive with their archetype
 * module, which appends to this list. Listing `post` here speculatively would
 * break the Studio on any site that does not install the blog.
 */
export type RoutableDocumentType = {
  /** Schema type name, as registered in `schemaTypes/index.ts`. */
  readonly name: string
  /** How the type is described in the reference picker. */
  readonly title: string
  /** `true` when the URL comes from `slug.current`; `false` for a type whose
   *  route is fixed and which therefore has no slug field. */
  readonly hasPath: boolean
}

export const routableDocumentTypes = [
  { name: 'homePage', title: 'Home page', hasPath: false },
  { name: 'page', title: 'Page', hasPath: true },
] as const satisfies readonly RoutableDocumentType[]

/** The shape a `reference` field's `to` expects.
 *
 * A function rather than a constant so each field gets its own array — Sanity
 * mutates the schema definitions it is handed while compiling them, and a
 * shared array is the kind of coupling that produces one bug on one field
 * months later. */
export function routableReferenceTargets(): { type: string }[] {
  return routableDocumentTypes.map(({ name }) => ({ type: name }))
}

/** Routable types that have no slug because their route is fixed. */
export const PATHLESS_ROUTABLE_TYPES: readonly string[] = routableDocumentTypes
  .filter(({ hasPath }) => !hasPath)
  .map(({ name }) => name)

/** Filter for every internal-link reference picker.
 *
 * A page with no web address yet cannot be linked to — offering it produces a
 * menu entry that 404s the moment either document is published. Fixed-route
 * types are exempt: they never had a slug to fill in.
 *
 * Built from the list above rather than written out, so adding a type does not
 * depend on anyone remembering that this string exists. */
export const ROUTABLE_TARGET_FILTER: string = [
  ...PATHLESS_ROUTABLE_TYPES.map((name) => `_type == "${name}"`),
  'defined(slug.current)',
].join(' || ')

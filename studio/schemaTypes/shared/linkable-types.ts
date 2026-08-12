/** The document types anything in this Studio may link to.
 *
 *  One list, read by every internal-link picker in the schema: the `link` object,
 *  and any block that lets an editor point at a page. A client site that adds a
 *  document type with a public URL of its own adds it here, once.
 *
 *  **Contract.** Every type listed here must be reachable at a URL the frontend
 *  can construct, and must have a `title` — the Studio shows it in the reference
 *  picker and in link previews. Types marked `hasSlug: false` live at a fixed
 *  route: there is exactly one home page and it is at `/`.
 *
 *  **Archetype types are added automatically**, from `studio/archetype.ts` —
 *  `post` for marketing, `product`/`productCategory` for catalogue, `docPage`
 *  for docs. They are not listed here, because a `reference` pointing at a type
 *  the active archetype does not register is a Studio-level error rather than a
 *  quiet no-op: hardcoding `post` here is exactly what made selecting the
 *  catalogue archetype fail with `Unknown type: post`.
 *
 *  Only add a type here if EVERY archetype has it. Otherwise it belongs in
 *  `ARCHETYPE_LINK_TARGETS`. */
import { activeLinkTargets, type LinkTarget } from '../../archetype'

const baseLinkableTypes: readonly LinkTarget[] = [
  { name: 'homePage', title: 'Home page', hasSlug: false },
  { name: 'page', title: 'Page', hasSlug: true },
]

export const linkableTypes: readonly LinkTarget[] = [
  ...baseLinkableTypes,
  ...activeLinkTargets,
]

/** The shape a `reference` field's `to` expects. */
export const linkableTypeRefs = linkableTypes.map(({ name }) => ({ type: name }))

/** Types whose route is fixed, so they have no slug to check. */
export const SLUGLESS_LINK_TARGETS: readonly string[] = linkableTypes
  .filter(({ hasSlug }) => !hasSlug)
  .map(({ name }) => name)

/** Filter for the internal-link reference picker.
 *
 *  A page with no web address yet has no address to link *to*, so offering it
 *  produces a menu entry that 404s the moment it is published. Fixed-route types
 *  are exempt — they never had a slug to fill in.
 *
 *  Built from the list above rather than written out, so adding a linkable type
 *  does not depend on anyone remembering that this string exists. */
export const linkableTypeFilter: string = [
  ...SLUGLESS_LINK_TARGETS.map((name) => `_type == "${name}"`),
  'defined(slug.current)',
].join(' || ')

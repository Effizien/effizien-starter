/** Which archetype this site is. Change this one line at scaffold time.
 *
 * D-012: one starter, archetype selected when the site is scaffolded — not three
 * template branches. All three content models live in this repo; exactly one is
 * registered.
 *
 * Registering only one is not tidiness, it is correctness. Sanity has a single
 * flat type registry, so a `product` type that is present but unused would still
 * appear in the "Create" menu, still be a valid reference target, and still
 * generate TypeScript types the frontend has no route for. An editor would find
 * document types belonging to a different kind of site entirely.
 *
 * ## Changing this after content exists
 *
 * Don't, casually. Switching archetype does not migrate anything: documents of
 * the previous archetype's types stay in the dataset, become unreachable in the
 * Studio, and are invisible to TypeGen — they are not deleted, but nothing will
 * show them to you. If a site genuinely changes shape, add the new archetype's
 * types alongside the old ones and migrate deliberately (see the deprecation
 * pattern in the Sanity schema rules).
 *
 * ## Adding a fourth archetype
 *
 * Add its bundle to `ARCHETYPE_SCHEMA_TYPES`, its page-builder block names to
 * `ARCHETYPE_PAGE_BUILDER_BLOCKS`, and its name to the union. Nothing else in
 * the Studio needs to know it exists.
 */

export type Archetype = 'marketing' | 'catalog' | 'docs'

/** ← THE SWITCH. Set this when scaffolding a client site. */
export const ARCHETYPE: Archetype = 'marketing'

/** Page-builder blocks each archetype contributes, BY NAME.
 *
 * Names, not imports, and deliberately so. `page-builder.ts` is part of the base
 * model and must not import archetype modules — that would be a cycle, since the
 * archetype bundles import the shared field helpers that `page-builder.ts` sits
 * beside. Sanity resolves array members through its name registry at schema
 * build time, so a string is all that is needed, and the type is guaranteed to
 * be registered because the same archetype selection drives both this list and
 * `schemaTypes/index.ts`.
 *
 * The failure mode this avoids: naming a block here whose type is registered by
 * a *different* archetype. Sanity then reports an unresolved type at Studio
 * start-up rather than at build, which is a confusing place to find out.
 */
export const ARCHETYPE_PAGE_BUILDER_BLOCKS: Record<Archetype, readonly string[]> = {
  marketing: ['articleList'],
  catalog: ['productList', 'enquiryForm'],
  docs: [],
}

/** Blocks the active archetype adds to the page builder. */
export const activePageBuilderBlocks: readonly string[] =
  ARCHETYPE_PAGE_BUILDER_BLOCKS[ARCHETYPE]

/** A document type an internal link may point at. */
export type LinkTarget = {
  readonly name: string
  readonly title: string
  /** `false` for types at a fixed route — there is one home page and it is `/`. */
  readonly hasSlug: boolean
}

/** Link targets each archetype contributes.
 *
 * Same reasoning as the page-builder blocks, and the same failure it prevents:
 * a `reference` whose `to` names a type the schema does not define is a
 * Studio-level error, not a quiet no-op. Before this list existed, `post` was
 * hardcoded into the base link targets, so selecting the catalogue or docs
 * archetype produced `Unknown type: post` at schema build — the archetype switch
 * was a one-line change that did not actually work.
 */
export const ARCHETYPE_LINK_TARGETS: Record<Archetype, readonly LinkTarget[]> = {
  marketing: [{ name: 'post', title: 'Article', hasSlug: true }],
  catalog: [
    { name: 'product', title: 'Product', hasSlug: true },
    { name: 'productCategory', title: 'Product category', hasSlug: true },
  ],
  docs: [{ name: 'docPage', title: 'Documentation page', hasSlug: true }],
}

/** Link targets the active archetype adds. */
export const activeLinkTargets: readonly LinkTarget[] = ARCHETYPE_LINK_TARGETS[ARCHETYPE]

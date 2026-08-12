/** The names of things, and which of them there is only one of.
 *
 * `structure.ts`, `presentation.ts` and `sanity.config.ts` all refer to document
 * types by name. Type names are strings, strings drift, and a drifted string in
 * a structure file fails *silently* — the document type simply stops appearing
 * where the editor expects it, and nothing in the Studio complains. Keeping every
 * name here makes a rename one edit, and lets `structure.ts` check each name
 * against the live schema and say so out loud when one stops resolving.
 *
 * This is the only file in the Studio config layer that hardcodes a type name.
 */

/** Document types this Studio arranges explicitly.
 *
 * Each must match the `name` of a `defineType({type: 'document'})` registered in
 * `schemaTypes/index.ts`. A type that is registered but missing from here is not
 * lost: `structure.ts` puts anything it does not place into a fallback section
 * rather than letting it become unreachable.
 *
 * Not every entry exists in every clone. A docs site has no `post`; a catalog
 * site adds `product`. `structure.ts` builds each section only when its types
 * are actually registered, so deleting the blog from a client's clone is a
 * schema edit, not a schema edit plus a structure edit nobody remembers until
 * the Studio white-screens.
 */
export const DOCUMENT_TYPE = {
  /** The site root. One per site — see `SINGLETONS`. */
  homePage: 'homePage',
  /** Header and footer menus. One per site — see `SINGLETONS`. */
  navigation: 'navigation',
  /** Site name, contact details, social profiles, SEO defaults. One per site. */
  siteSettings: 'siteSettings',
  /** A page with a URL of its own, composed from page-builder sections. */
  page: 'page',
  /** A dated, authored article. */
  post: 'post',
  /** A human: article author, team member, quoted expert. */
  person: 'person',
  /** Subject taxonomy for articles. */
  category: 'category',
  /** One old URL mapped to one new URL. Consumed by `next.config.ts`. */
  redirect: 'redirect',

  /* ── Archetype types ───────────────────────────────────────────────────────
     Named here even though only one archetype is registered at a time
     (`studio/archetype.ts`). This map is how `structure.ts` and
     `presentation.ts` refer to types by name; both already guard on the type
     actually being present in the schema, so a name for an inactive archetype
     resolves to nothing and is filed away rather than breaking the Studio.
     Keeping all of them here means the docs and catalogue models compile
     whichever archetype is active — which is what makes the switch a one-line
     change instead of a merge. */

  /** Docs archetype: a single documentation page. */
  docPage: 'docPage',
  /** Docs archetype: the ordered tree of sections and pages. Singleton. */
  docsNavigation: 'docsNavigation',
} as const

/** A singleton, as the Studio config layer needs to know about it. */
export type SingletonDefinition = {
  /** Schema type name, as registered in `schemaTypes/index.ts`. */
  readonly type: string
  /** Sidebar label. Write it for the client, not for the schema. */
  readonly title: string
}

/** Singleton documents — exactly one of each, for the whole site.
 *
 * Sanity has no `singleton: true` schema option, and inventing one in the schema
 * would do nothing. A singleton is an ordinary document type held in place by
 * three separate mechanisms, all of which read this list:
 *
 *   1. `structure.ts` pins the type to a fixed `_id`, so the editor opens *the*
 *      document by name instead of picking one out of a list of one.
 *   2. `document.newDocumentOptions` in `sanity.config.ts` removes the type from
 *      the "Create" menu — in the navbar, in panes, and on reference inputs — so
 *      a second one cannot be made by accident.
 *   3. `document.actions` in `sanity.config.ts` removes Delete, Duplicate and
 *      Unpublish, so the one that exists cannot be destroyed by accident.
 *
 * Any one of the three missing and the guarantee is not a guarantee. Skip (1)
 * and every published copy is a candidate for the frontend query. Skip (2) and a
 * client creates "Site settings (2)", edits it for a week, and cannot work out
 * why the footer never changes. Skip (3) and the home page is one menu click
 * from a 404 on the root route.
 *
 * Adding an entry here wires up all three. There is no fourth place.
 *
 * Order here is the order in the sidebar.
 */
export const SINGLETONS = [
  { type: DOCUMENT_TYPE.homePage, title: 'Home page' },
  { type: DOCUMENT_TYPE.navigation, title: 'Navigation' },
  { type: DOCUMENT_TYPE.siteSettings, title: 'Site settings' },
] as const satisfies readonly SingletonDefinition[]

/** Membership test for the guards in `sanity.config.ts`. */
export const SINGLETON_TYPES: ReadonlySet<string> = new Set(
  SINGLETONS.map((singleton) => singleton.type),
)

/** The `_id` a singleton is pinned to.
 *
 * The type name doubles as the id, which turns the frontend query into a direct
 * id lookup — `*[_id == "siteSettings"][0]` — rather than a type scan, and makes
 * "is there exactly one?" answerable by looking at a URL.
 *
 * This function is also the seam the i18n module extends, and the reason
 * localisation stays a module rather than a migration. Document-level
 * localisation gives each locale its own document, so a localised singleton
 * needs one id per locale. Extending this to
 *
 *   (type, locale) => (locale === defaultLocale ? type : `${type}-${locale}`)
 *
 * leaves the default locale on the id it already has: turning localisation on
 * later *adds* documents rather than renaming existing ones. That matters
 * because a Sanity document id is immutable — "renaming" one means creating a
 * new document and repointing every reference to it by hand.
 */
export function singletonDocumentId(type: string): string {
  return type
}

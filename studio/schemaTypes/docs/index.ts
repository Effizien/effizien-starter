import type { SchemaTypeDefinition } from 'sanity'

import { callout } from './callout'
import { codeBlock } from './code-block'
import { docBody } from './doc-body'
import { docPage } from './doc-page'
import { docsNavigation } from './docs-navigation'
import { docsSection } from './docs-section'

/** The documentation archetype, as one import.
 *
 *  ## Why this archetype is a directory and not scattered by kind
 *
 *  The rest of the schema is filed by kind — `documents/`, `objects/`,
 *  `blocks/`, `shared/` — and this deliberately is not. Archetypes are chosen at
 *  scaffold time (D-012: one starter, archetype chosen when scaffolding), which
 *  means the common operation on this code is *deleting all of it*. Filed by
 *  kind, that is six files to find across four directories and a shared limits
 *  file someone will leave behind; filed by archetype, it is `rm -rf
 *  schemaTypes/docs` and four lines.
 *
 *  ## Wiring in
 *
 *  1. `schemaTypes/index.ts` — import this and spread it:
 *
 *       import {docsSchemaTypes} from './docs'
 *       export const schemaTypes: SchemaTypeDefinition[] = [
 *         ...baseSchemaTypes,
 *         ...pageBuilderSchemaTypes,
 *         ...docsSchemaTypes,
 *       ]
 *
 *  2. `studio/document-types.ts` — two entries in `DOCUMENT_TYPE`
 *     (`docPage: 'docPage'`, `docsNavigation: 'docsNavigation'`) and one in
 *     `SINGLETONS` (`{type: DOCUMENT_TYPE.docsNavigation, title: 'Documentation
 *     menu'}`). The singleton entry is what pins the menu to a fixed id and takes
 *     Delete and Duplicate off it; all three mechanisms read that one list.
 *
 *  3. `studio/presentation.ts` — `docsIndex: '/docs'` and
 *     `docPage: (slug: string) => \`/docs/${slug}\`` in `ROUTE`, a `mainDocuments`
 *     entry for `/docs/:slug` **above** the generic `/:slug` rule, and `locations`
 *     entries for both new types. `doc-page.ts` imports `ROUTE.docPage`, so
 *     skipping this is a compile error rather than a silent 404 in the preview
 *     pane.
 *
 *  4. `schemaTypes/shared/linkable-types.ts` — one entry,
 *     `{name: 'docPage', title: 'Documentation page', hasSlug: true}`. Without it
 *     nothing in the Studio can link to a documentation page: not a menu, not a
 *     button, not a link inside prose.
 *
 *  Nothing else. `structure.ts` places unfiled document types under a divider on
 *  its own, so the Studio is usable before anyone touches it — see the wiring
 *  notes for the section worth adding.
 *
 *  ## Wiring out
 *
 *  Delete this directory and revert those four edits. Nothing in the base library
 *  or the page-builder library imports anything from here; the dependency runs
 *  one way only, which is what makes the archetype separable.
 *
 *  Run `pnpm typegen` after either direction.
 *
 *  ## What this archetype depends on, and does not fork
 *
 *  `link`, `mediaImage`, `simpleRichText`, `seo` (through `seoField`),
 *  `slugField`, `DOCUMENT_FIELD_GROUPS`, `describeHeadingOutlineProblem`,
 *  `previewText`/`describeCount`, `toSlug`, `LIMIT` and `STUDIO_API_VERSION` —
 *  all used exactly as the base library defines them.
 *
 *  It does not use `pageBuilder`. A documentation page is prose, not a composed
 *  set of sections, and the page builder's own notes say as much: rigid,
 *  formulaic content is Portable Text, not a block array. A documentation site
 *  still installs the block library, because `page` and `homePage` need it for
 *  everything that is not the manual — the landing page, pricing, contact. */
export const docsSchemaTypes: SchemaTypeDefinition[] = [
  /* The two document types: what an editor makes, and where it sits. */
  docPage,
  docsNavigation,

  /* One group of pages in the menu. Editors never create these outside the menu. */
  docsSection,

  /* The body of a documentation page, and the two things it holds that no other
     rich text in this schema does. */
  docBody,
  codeBlock,
  callout,
]

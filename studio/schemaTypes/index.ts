import type { SchemaTypeDefinition } from 'sanity'

/** The content model.
 *
 * Deliberately empty. WP4 builds the reusable schema library — base types
 * (page, post, navigation, SEO object, media, redirect), the three archetypes
 * (marketing, catalog, docs), and the page-builder block library.
 *
 * Structure, when it arrives (see `project-structure` in the Sanity rules):
 *
 *   schemaTypes/
 *   ├── index.ts        this file — exports everything
 *   ├── documents/      standalone content types (page.ts, post.ts)
 *   ├── objects/        reusable embedded types (seo.ts, link.ts)
 *   ├── blocks/         page-builder / Portable Text blocks (hero.ts)
 *   └── shared/         shared field definitions
 *
 * kebab-case filenames; each file exports a named const matching its name.
 *
 * Model the content before writing the code. A schema shaped around the first
 * page design is the single most expensive thing to unpick later, because every
 * document already created has to be migrated. */
export const schemaTypes: SchemaTypeDefinition[] = []

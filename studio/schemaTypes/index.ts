import type { SchemaTypeDefinition } from 'sanity'

import { ARCHETYPE } from '../archetype'
import { marketingSchemaTypes } from './archetypes/marketing'
import { pageBuilderSchemaTypes } from './blocks'
import { catalogSchemaTypes } from './catalog'
import { docsSchemaTypes } from './docs'
import { homePage } from './documents/home-page'
import { navigation } from './documents/navigation'
import { page } from './documents/page'
import { redirect } from './documents/redirect'
import { siteSettings } from './documents/site-settings'
import { link } from './objects/link'
import { mediaImage } from './objects/media-image'
import { navigationGroup } from './objects/navigation-group'
import { navigationLink } from './objects/navigation-link'
import { seo } from './objects/seo'
import { socialLink } from './objects/social-link'

/** The content model.
 *
 * Sanity has one flat type registry: every type — document, object, block — is
 * addressable only by its `name`, and `type: 'mediaImage'` resolves through this
 * array regardless of which directory the file lives in. The directory structure
 * is for people; this array is what Sanity sees.
 *
 * Three layers:
 *
 *   BASE          every site has these — a page, a home page, navigation,
 *                 settings, redirects, and the objects they are built from.
 *   PAGE BUILDER  the section library, bundled by `blocks/index.ts`. That bundle
 *                 also registers the objects the sections are composed of
 *                 (richText, action, featureItem, faqItem, testimonial), which
 *                 is why they are not listed again here.
 *   ARCHETYPE     exactly one of marketing / catalog / docs, chosen by
 *                 `studio/archetype.ts`. See that file for why only one.
 */

/** Types every site gets, whatever it is for. */
const baseSchemaTypes: SchemaTypeDefinition[] = [
  /* Documents. `homePage`, `navigation` and `siteSettings` are singletons —
     pinned to fixed ids and stripped of create/delete by `structure.ts` and
     `sanity.config.ts`. They are ordinary types here; nothing in the schema
     makes a singleton, which is why `document-types.ts` exists. */
  page,
  homePage,
  navigation,
  siteSettings,
  redirect,

  /* Objects used across document types. */
  seo,
  mediaImage,
  link,
  navigationGroup,
  navigationLink,
  socialLink,
]

/** The archetype bundles, keyed so the switch in `archetype.ts` selects one.
 *
 * All three are imported. Only the selected one is registered — the others are
 * dead code the bundler drops, and their types never reach the Studio, the
 * "Create" menu, or TypeGen. */
const ARCHETYPE_SCHEMA_TYPES: Record<typeof ARCHETYPE, SchemaTypeDefinition[]> = {
  marketing: marketingSchemaTypes,
  catalog: catalogSchemaTypes,
  docs: docsSchemaTypes,
}

export const schemaTypes: SchemaTypeDefinition[] = [
  ...baseSchemaTypes,
  ...pageBuilderSchemaTypes,
  ...ARCHETYPE_SCHEMA_TYPES[ARCHETYPE],
]

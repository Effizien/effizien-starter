import type { SchemaTypeDefinition } from 'sanity'

import { action } from '../objects/action'
import { faqItem } from '../objects/faq-item'
import { featureItem } from '../objects/feature-item'
import { richText } from '../objects/rich-text'
import { simpleRichText } from '../objects/simple-rich-text'
import { testimonial } from '../objects/testimonial'
import { callToAction } from './call-to-action'
import { faqs } from './faqs'
import { features } from './features'
import { hero } from './hero'
import { pageBuilder } from './page-builder'
import { testimonials } from './testimonials'
import { textSection } from './text-section'

/** The page-builder library, as one import.
 *
 *  `schemaTypes/index.ts` spreads this rather than listing thirteen types, so
 *  adding or removing a block is one edit in one file — and so that the block
 *  library can be lifted into another project whole.
 *
 *  Everything here is registered globally, because Sanity has one flat type
 *  registry: an object type is only addressable by name, and `type: 'featureItem'`
 *  inside `features` resolves through that registry regardless of where the file
 *  sits. The directory structure is for people.
 *
 *  Depends on two types owned by the base content model, referenced by name and
 *  not imported: `link` (a destination) and `mediaImage` (an image that cannot be
 *  published without a description or an explicit decorative flag). A client
 *  clone that drops either has to replace them, not delete them. */
export const pageBuilderSchemaTypes: SchemaTypeDefinition[] = [
  /* The array itself — what `page.pageBuilder` and `homePage.pageBuilder` are. */
  pageBuilder,

  /* The blocks, in the order they appear in the insert menu. */
  hero,
  textSection,
  features,
  faqs,
  testimonials,
  callToAction,

  /* Objects the blocks are built from. Editors never insert these directly. */
  action,
  featureItem,
  faqItem,
  testimonial,

  /* Rich text, in two flavours: with headings, and without. */
  richText,
  simpleRichText,
]

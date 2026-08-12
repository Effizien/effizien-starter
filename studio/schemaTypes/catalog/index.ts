import type { SchemaTypeDefinition } from 'sanity'
import { enquiryForm } from './blocks/enquiry-form'
import { productList } from './blocks/product-list'
import { enquirySettings } from './documents/enquiry-settings'
import { product } from './documents/product'
import { productAttribute } from './documents/product-attribute'
import { productAttributeOption } from './documents/product-attribute-option'
import { productCategory } from './documents/product-category'
import { productDownload } from './objects/product-download'
import { productSpecMeasurement } from './objects/product-spec-measurement'
import { productSpecOption } from './objects/product-spec-option'
import { productSpecText } from './objects/product-spec-text'
import { productVariant } from './objects/product-variant'

/** The catalogue archetype, as one import.
 *
 * ## Adding it (D-012: the archetype is chosen when the site is scaffolded)
 *
 * Six lines, in six files, all of them additive:
 *
 *   1. `schemaTypes/index.ts`
 *        import {catalogSchemaTypes} from './catalog'
 *        …and spread `...catalogSchemaTypes` into the exported array.
 *
 *   2. `blocks/page-builder.ts` — two array members, so the two catalogue
 *      sections appear in the insert menu:
 *        defineArrayMember({type: 'productList'}),
 *        defineArrayMember({type: 'enquiryForm'}),
 *
 *   3. `document-types.ts` — `...CATALOG_TYPE` inside `DOCUMENT_TYPE`, and
 *      `...CATALOG_SINGLETONS` inside `SINGLETONS`. The singleton spread is what
 *      pins Enquiries to a fixed id and takes Delete and Duplicate off its menu.
 *
 *   4. `shared/linkable-types.ts` — two entries, so menus and buttons can point
 *      at a product or a category:
 *        {name: 'product', title: 'Product', hasSlug: true},
 *        {name: 'productCategory', title: 'Product category', hasSlug: true},
 *
 *   5. `presentation.ts` — `...catalogMainDocuments` into `mainDocuments` (above
 *      the generic `/:slug` rule) and `...catalogLocations` into `locations`.
 *
 *   6. `structure.ts` — one call, and its result into the `content` array:
 *        const catalogue = catalogSection(S, context, placed)
 *      `placed` is passed in so the base file's safety net does not list the
 *      catalogue types a second time under the divider at the bottom.
 *
 *   …and `sanity.config.ts` if the client will maintain their own specification
 *   vocabulary: `templates: (prev) => [...prev, ...catalogInitialValueTemplates]`.
 *
 * ## Removing it
 *
 * Delete this directory and those lines. Nothing outside `catalog/` refers to a
 * product by name, no base type has a field that points at one, and no base file
 * imports anything from here except through this index. That is the whole reason
 * for the directory and for `catalog-types.ts`.
 *
 * ## What it depends on, and does not own
 *
 * `mediaImage`, `richText`, `simpleRichText`, `action`, `link` and `seo` are the
 * base library's, referenced by name and never redefined — which is what keeps
 * one image type with one description requirement across the whole Studio. The
 * page-builder sections here are additions to that library, not a second one.
 */
export const catalogSchemaTypes: SchemaTypeDefinition[] = [
  /* Documents, in the order they are reached in the Studio. */
  product,
  productCategory,
  productAttribute,
  productAttributeOption,
  enquirySettings,

  /* Page-builder sections. Add these two to `pageBuilder`'s `of` array. */
  productList,
  enquiryForm,

  /* Objects the documents are built from. Editors never insert these from a
     top-level menu; they appear inside the arrays that hold them. */
  productSpecMeasurement,
  productSpecOption,
  productSpecText,
  productVariant,
  productDownload,
]

export { CATALOG_LIMIT } from './catalog-limits'
export { CATALOG_ROUTE, catalogLocations, catalogMainDocuments } from './catalog-routes'
export { catalogInitialValueTemplates, catalogSection } from './catalog-structure'
export {
  CATALOG_FIELD_GROUP,
  CATALOG_SINGLETONS,
  CATALOG_TEMPLATE,
  CATALOG_TYPE,
  SPECIFICATION_KINDS,
} from './catalog-types'

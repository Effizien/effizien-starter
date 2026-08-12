import { FolderIcon } from '@sanity/icons/Folder'
import { PackageIcon } from '@sanity/icons/Package'
import type { Template } from 'sanity'
import type {
  ListItemBuilder,
  StructureBuilder,
  StructureResolverContext,
} from 'sanity/structure'

import { CATALOG_TEMPLATE, CATALOG_TYPE } from './catalog-types'

/** The catalogue, as an editor navigates it.
 *
 * ## The problem this file exists to solve
 *
 * A default document list holds five hundred products in one flat pane sorted by
 * whatever was edited last. Everything in it is called something like
 * "Adapter plate", and finding one means either knowing its exact name or
 * scrolling. That is the moment a client stops using the CMS and starts emailing
 * the agency, and no amount of schema quality survives it.
 *
 * Four answers, in the order they matter:
 *
 *   1. **Browse by category.** How a client thinks about their own catalogue —
 *      they do not remember a product name, they remember it is a valve. Twelve
 *      categories, then twenty products, is two decisions instead of five
 *      hundred.
 *   2. **Sort by name, everywhere.** A phone book, not a haystack. "Recently
 *      updated" is still one click away in the pane's own sort menu, which is
 *      generated from each type's `orderings`.
 *   3. **A subtitle that disambiguates.** Every product row shows its article
 *      number and its category, because that is what tells two "Adapter plate"s
 *      apart. That lives in the schema type's `preview`, not here.
 *   4. **Specifications kept out of the way.** They are edited a handful of
 *      times a year and would otherwise sit in the sidebar next to the things
 *      edited weekly. Their allowed answers are nested inside them, which is
 *      also the only place the "Add" button can know which specification a new
 *      answer belongs to.
 *
 * Search still covers everything: none of these lists is a filtered *view* of
 * products in the sense `structure.ts` warns about, except the by-category pane,
 * which is reached deliberately and sits beside an unfiltered "All products".
 *
 * ## Wiring
 *
 * `catalogSection` takes the `placed` set from `structure.ts` and adds every
 * type it puts somewhere. Without that, the base file's safety net would list
 * all four types a second time under the divider at the bottom.
 */

/** Pre-fills the specification on an allowed answer created from inside it.
 *
 * The alternative is `disableNew: false` on the reference and a client who
 * creates "Titanium" with no specification attached — a document that is
 * invisible everywhere on the site and impossible to explain.
 *
 * Registered in `sanity.config.ts` under `templates`. It takes a parameter, so
 * it does not appear in the global "Create" menu, where it could not be resolved.
 */
export const catalogInitialValueTemplates: Template[] = [
  {
    id: CATALOG_TEMPLATE.attributeOption,
    title: 'Allowed answer',
    schemaType: CATALOG_TYPE.productAttributeOption,
    parameters: [{ name: 'attributeId', type: 'string' }],
    value: ({ attributeId }: { attributeId: string }) => ({
      attribute: { _type: 'reference', _ref: attributeId },
    }),
  },
]

export function catalogSection(
  S: StructureBuilder,
  context: StructureResolverContext,
  placed: Set<string>,
): ListItemBuilder | null {
  const has = (type: string) => context.schema.has(type)
  const iconFor = (type: string) => context.schema.get(type)?.icon

  /* No products, no catalogue. A clone that keeps the categories and drops the
     products has bigger problems than this pane. */
  if (!has(CATALOG_TYPE.product)) return null

  const items: ListItemBuilder[] = []

  placed.add(CATALOG_TYPE.product)
  items.push(
    S.listItem()
      .id('all-products')
      .title('All products')
      .icon(iconFor(CATALOG_TYPE.product))
      .child(
        S.documentTypeList(CATALOG_TYPE.product)
          .title('All products')
          .defaultOrdering([{ field: 'title', direction: 'asc' }]),
      ),
  )

  if (has(CATALOG_TYPE.productCategory)) {
    placed.add(CATALOG_TYPE.productCategory)

    items.push(
      S.listItem()
        .id('products-by-category')
        .title('Products by category')
        .icon(FolderIcon)
        .child(
          S.documentTypeList(CATALOG_TYPE.productCategory)
            .title('Products by category')
            .defaultOrdering([{ field: 'title', direction: 'asc' }])
            /* Replacing the child pane means this list browses *into* a
               category rather than opening it for editing — which is why
               "Categories" below exists as well. Two entries, each doing one
               thing, beats one entry an editor has to guess the behaviour of. */
            .child((categoryId) =>
              S.documentList()
                .id('products-in-category')
                .title('Products')
                .schemaType(CATALOG_TYPE.product)
                .filter('_type == $type && category._ref == $categoryId')
                .params({ type: CATALOG_TYPE.product, categoryId })
                .defaultOrdering([{ field: 'title', direction: 'asc' }]),
            ),
        ),
    )

    items.push(
      S.listItem()
        .id(CATALOG_TYPE.productCategory)
        .title('Categories')
        .icon(iconFor(CATALOG_TYPE.productCategory))
        .child(
          S.documentTypeList(CATALOG_TYPE.productCategory)
            .title('Categories')
            .defaultOrdering([{ field: 'title', direction: 'asc' }]),
        ),
    )
  }

  if (has(CATALOG_TYPE.productAttribute)) {
    placed.add(CATALOG_TYPE.productAttribute)
    const hasOptions = has(CATALOG_TYPE.productAttributeOption)
    if (hasOptions) placed.add(CATALOG_TYPE.productAttributeOption)

    items.push(
      S.listItem()
        .id(CATALOG_TYPE.productAttribute)
        .title('Specifications')
        .icon(iconFor(CATALOG_TYPE.productAttribute))
        .child(
          S.documentTypeList(CATALOG_TYPE.productAttribute)
            .title('Specifications')
            .defaultOrdering([{ field: 'label', direction: 'asc' }])
            .child((attributeId) =>
              S.list()
                .id('specification')
                .title('Specification')
                .items([
                  S.listItem()
                    .id('details')
                    .title('Details')
                    .icon(iconFor(CATALOG_TYPE.productAttribute))
                    .child(
                      S.document()
                        .id('details')
                        .schemaType(CATALOG_TYPE.productAttribute)
                        .documentId(attributeId),
                    ),
                  ...(hasOptions
                    ? [
                        S.listItem()
                          .id('options')
                          .title('Allowed answers')
                          .icon(iconFor(CATALOG_TYPE.productAttributeOption))
                          .child(
                            S.documentList()
                              .id('options')
                              .title('Allowed answers')
                              .schemaType(CATALOG_TYPE.productAttributeOption)
                              .filter('_type == $type && attribute._ref == $attributeId')
                              .params({
                                type: CATALOG_TYPE.productAttributeOption,
                                attributeId,
                              })
                              .defaultOrdering([{ field: 'label', direction: 'asc' }])
                              /* The whole reason answers are nested here: this
                                 is the one "Add" button that knows which
                                 specification a new answer belongs to. */
                              .initialValueTemplates([
                                S.initialValueTemplateItem(
                                  CATALOG_TEMPLATE.attributeOption,
                                  {
                                    attributeId,
                                  },
                                ),
                              ]),
                          ),
                      ]
                    : []),
                ]),
            ),
        ),
    )
  }

  return S.listItem()
    .id('catalogue')
    .title('Catalogue')
    .icon(PackageIcon)
    .child(S.list().id('catalogue').title('Catalogue').items(items))
}

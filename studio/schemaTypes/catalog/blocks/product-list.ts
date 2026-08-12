import { PackageIcon } from '@sanity/icons/Package'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { sectionFields } from '../../shared/section-fields'
import { previewText } from '../../shared/section-preview'
import { CATALOG_LIMIT } from '../catalog-limits'
import { CATALOG_TYPE } from '../catalog-types'

/** Products, on a page that is not the catalogue.
 *
 * `blocks/page-builder.ts` names "a list of other documents" as the most likely
 * seventh block and says why it is not in the base library: it can only be
 * designed once a site's document types exist. This is that block, arriving with
 * the type it lists.
 *
 * ## Two sources, one block
 *
 * Chosen by hand for a home page ("our three best sellers"), or drawn from a
 * category for a landing page ("everything in Valves"). They are the same
 * section from a reader's point of view, and splitting them would give the
 * insert menu two entries an editor has to choose between before they know what
 * either does.
 *
 * The chosen list is references rather than copies, so a product renamed or
 * discontinued updates everywhere it is featured, and Sanity refuses to delete a
 * product that a home page still points at.
 *
 * ## What it is not
 *
 * Not a filter, not a grid layout, not a carousel. How many columns and whether
 * it scrolls are the front end's decisions; how many products and which ones are
 * the editor's, and those are the only two fields here that are not words.
 */
export const productList = defineType({
  name: 'productList',
  title: 'Products',
  type: 'object',
  icon: PackageIcon,
  fields: [
    ...sectionFields,

    defineField({
      name: 'source',
      title: 'Which products?',
      type: 'string',
      initialValue: 'chosen',
      options: {
        layout: 'radio',
        list: [
          { title: 'The ones I choose', value: 'chosen' },
          { title: 'Everything in a category', value: 'category' },
        ],
      },
      description:
        'Choosing them by hand keeps the section deliberate; drawing them from a ' +
        'category keeps it current without anyone remembering to come back.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'products',
      title: 'Products',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: CATALOG_TYPE.product }],
          options: { disableNew: true },
        }),
      ],
      hidden: ({ parent }) =>
        (parent as { source?: string } | undefined)?.source !== 'chosen',
      description: 'Drag to reorder. This is the order they appear in.',
      validation: (rule) => [
        rule.unique(),
        rule.custom((value, context) => {
          const source = (context.parent as { source?: string } | undefined)?.source
          if (source !== 'chosen') return true
          if (Array.isArray(value) && value.length > 0) return true
          return 'Choose at least one product, or this section publishes as a heading with an empty space under it.'
        }),
        rule
          .max(CATALOG_LIMIT.listedProducts)
          .warning(
            `Past ${CATALOG_LIMIT.listedProducts} products this is a catalogue page ` +
              'rather than a section on one. Link to the category instead.',
          ),
      ],
    }),

    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: CATALOG_TYPE.productCategory }],
      options: { disableNew: true },
      hidden: ({ parent }) =>
        (parent as { source?: string } | undefined)?.source !== 'category',
      description:
        'Products filed in this category, newest first. Products added to it later ' +
        'appear here automatically.',
      validation: (rule) =>
        rule.custom((value, context) => {
          const source = (context.parent as { source?: string } | undefined)?.source
          if (source !== 'category' || value) return true
          return 'Choose the category to draw from, or this section publishes empty.'
        }),
    }),

    defineField({
      name: 'maximum',
      title: 'How many to show',
      type: 'number',
      initialValue: 6,
      hidden: ({ parent }) =>
        (parent as { source?: string } | undefined)?.source !== 'category',
      description: 'The rest are reachable from the link below, or from the catalogue.',
      validation: (rule) =>
        rule
          .integer()
          .min(1)
          .max(CATALOG_LIMIT.listedProducts)
          .error(
            `Choose between 1 and ${CATALOG_LIMIT.listedProducts}. More than that is a ` +
              'catalogue page, and this section is a taste of one.',
          ),
    }),

    defineField({
      name: 'action',
      title: 'Link below the products',
      type: 'action',
      description:
        'Optional — "See all valves", "Browse the catalogue". Name the destination ' +
        'rather than writing "See more": someone listing the links on this page with a ' +
        'screen reader would otherwise get several identical rows.',
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      intro: 'intro',
      source: 'source',
      products: 'products',
      category: 'category.title',
      maximum: 'maximum',
    },
    prepare({ heading, intro, source, products, category, maximum }) {
      const count = Array.isArray(products) ? products.length : 0
      const detail =
        source === 'category'
          ? category
            ? `up to ${maximum ?? 6} from ${category}`
            : 'no category chosen'
          : count === 0
            ? 'none chosen yet'
            : `${count} chosen`

      return {
        title: previewText(heading) || previewText(intro) || 'Products',
        subtitle: `Products · ${detail}`,
        media: PackageIcon,
      }
    },
  },
})

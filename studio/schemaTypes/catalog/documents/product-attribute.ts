import { FilterIcon } from '@sanity/icons/Filter'
import { defineArrayMember, defineField, defineType, getPublishedId } from 'sanity'

import { toSlug } from '../../shared/slug-field'
import { isValueUniqueAcrossDocuments, STUDIO_API_VERSION } from '../../shared/validation'
import { CATALOG_LIMIT } from '../catalog-limits'
import { CATALOG_TYPE, SPECIFICATION_KINDS, specificationKind } from '../catalog-types'

/** One row of the specification table, defined once for the whole site.
 *
 * "Operating voltage", "Shelf life", "Material", "Certification". A product does
 * not describe its own specification rows; it fills in the ones defined here.
 * That is the difference between a catalogue two hundred products can be
 * filtered and compared in, and two hundred separately-worded tables.
 *
 * The long-form argument for entity–attribute–value over a free-text blob and
 * over a fixed field set is in `catalog-types.ts`, next to the table that
 * defines the three kinds. What this file adds is the two fields that make the
 * model survive contact with a live site.
 *
 * ## `key` is the identity; `label` is only the wording
 *
 * A filtered catalogue address looks like `/products?material=stainless-steel`.
 * That address gets bookmarked, linked to from a supplier's site, and indexed.
 * If it were built from the label, renaming "Material" to "Body material" would
 * break every one of them. So the key is separate, generated once, and warned
 * about if it is ever changed.
 *
 * It is also what makes localisation a module rather than a migration. Under
 * document-level localisation each locale gets its own copy of this document —
 * German labels, German explanations — carrying *the same key*. Filters, the
 * frontend and any export keep working across locales because the thing they
 * match on was never the human wording. Nothing here has to become an
 * `internationalizedArrayString`, which is the type change that would force a
 * migration of every product already written.
 *
 * ## What is deliberately not here
 *
 * - **The allowed answers.** They are documents (`productAttributeOption`), not
 *   an array of strings on this one. A product referencing an answer means the
 *   Studio refuses to delete an answer that is still in use, the frontend can
 *   count how many products carry it before offering it as a filter, and
 *   renaming "Stainless steel" to "Stainless steel 304" updates two hundred
 *   products at once instead of none of them.
 * - **Any presentation.** No column width, no display order, no icon. The order
 *   of the rows is the order of the array on the product, which is where an
 *   editor can see what they are ordering.
 */
export const productAttribute = defineType({
  name: CATALOG_TYPE.productAttribute,
  title: 'Specification',
  type: 'document',
  icon: FilterIcon,

  fields: [
    defineField({
      name: 'label',
      title: 'Name',
      type: 'string',
      description:
        'What this row is called in the left-hand column of every specification ' +
        'table — "Operating voltage", "Shelf life", "Material". Use the word your ' +
        'customers use, not the one in your ERP.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Give this specification a name, or it appears as a blank label above a ' +
              'value on every product that uses it.',
          ),
        rule
          .max(CATALOG_LIMIT.attributeLabel)
          .warning(
            `Past about ${CATALOG_LIMIT.attributeLabel} characters this wraps over ` +
              'several lines in the narrow left column of the table and pushes the ' +
              'values out of line.',
          ),
      ],
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'slug',
      description:
        'Used in the web address when someone filters the catalogue by this ' +
        '(/products?material=…). Click Generate once and then leave it alone — ' +
        'changing it breaks any filtered link that has already been shared or indexed.',
      options: {
        source: 'label',
        maxLength: CATALOG_LIMIT.key,
        slugify: (input: string) => toSlug(input, CATALOG_LIMIT.key),
        isUnique: () => true,
      },
      validation: (rule) => [
        rule
          .required()
          .error(
            'This needs a key before the specification can be used. Click Generate to ' +
              'build one from the name.',
          ),

        rule.custom((value) => {
          const current = (value as { current?: string } | undefined)?.current
          if (!current) return true
          if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(current)) return true
          const suggestion = toSlug(current, CATALOG_LIMIT.key)
          return suggestion
            ? `"${current}" cannot be used in a web address. Use lowercase letters, ` +
                `numbers and hyphens only — click Generate and it becomes "${suggestion}".`
            : `"${current}" contains nothing a web address can carry. Type a key by ` +
                'hand using lowercase letters, numbers and hyphens.'
        }),

        rule.custom(async (value, context) => {
          const current = (value as { current?: string } | undefined)?.current
          if (!current) return true

          const unique = await isValueUniqueAcrossDocuments(
            current,
            { fieldPath: 'key.current', types: [CATALOG_TYPE.productAttribute] },
            context,
          )

          return (
            unique ||
            `Another specification already uses the key "${current}". Two of them ` +
              'would collide in the filter address and only one would ever apply. Give ' +
              'this one a different key.'
          )
        }),
      ],
    }),

    defineField({
      name: 'valueType',
      title: 'What kind of answer does it take?',
      type: 'string',
      description:
        'This decides how the answer is stored, and it is worth getting right first ' +
        'time. Numbers can be sorted and searched as ranges; answers from a list can ' +
        'be offered as filters and stay spelled the same on every product; free text ' +
        'can do neither, so use it only when the other two genuinely do not fit.',
      options: {
        layout: 'radio',
        list: SPECIFICATION_KINDS.map((kind) => ({
          title: kind.choice,
          value: kind.valueType,
        })),
      },
      validation: (rule) => [
        rule
          .required()
          .error(
            'Choose what kind of answer this takes. Until it is set, no product can ' +
              'record it — the pickers on the product form filter by exactly this.',
          ),

        /* Changing the kind after products have used it strands their rows.
           A warning rather than an error, deliberately: the fix is in other
           documents, and the house rule is never to block a publish on
           something the editor cannot fix from inside the one they are in.
           The blocking version of this rule lives on the rows themselves, in
           `shared/specification-fields.ts`, where the fix is. */
        rule
          .custom(async (valueType, context) => {
            const kind = specificationKind(valueType)
            const id = getPublishedId(context.document?._id ?? '')
            if (!kind || !id) return true

            const client = context.getClient({ apiVersion: STUDIO_API_VERSION })
            const stale = await client.fetch<{
              total: number
              examples: (string | null)[]
            }>(
              `{
                "total": count(*[_type == $productType && count(specifications[attribute._ref == $id && _type != $rowType]) > 0]),
                "examples": *[_type == $productType && count(specifications[attribute._ref == $id && _type != $rowType]) > 0][0...3].title
              }`,
              { productType: CATALOG_TYPE.product, id, rowType: kind.rowType },
            )

            if (!stale || stale.total === 0) return true

            const named = stale.examples.filter((title): title is string =>
              Boolean(title),
            )
            const examples =
              named.length > 0
                ? ` (${named.join(', ')}${stale.total > named.length ? ', …' : ''})`
                : ''

            return (
              `${stale.total} ${stale.total === 1 ? 'product records' : 'products record'} ` +
              `this specification as a different kind${examples}. Those rows will show an ` +
              'error and will not appear in the table until each one is deleted and added ' +
              'again as the new kind. Set this back to what it was if that was not what ' +
              'you meant.'
            )
          })
          .warning(),
      ],
    }),

    defineField({
      name: 'unit',
      title: 'Unit',
      type: 'string',
      description:
        'The unit shown after every value — "mm", "kg", "V", "months". Written once ' +
        'here so it cannot be typed differently on different products, and so a ' +
        'change of unit is one edit. Leave it empty for a count.',
      hidden: ({ parent }) =>
        (parent as { valueType?: string } | undefined)?.valueType !== 'number',
      validation: (rule) =>
        rule
          .max(12)
          .warning(
            'A unit is a symbol or an abbreviation — "kg", not "kilogrammes per ' +
              'carton". Anything longer belongs in the name of the specification.',
          ),
    }),

    defineField({
      name: 'categories',
      title: 'Applies to',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: CATALOG_TYPE.productCategory }],
        }),
      ],
      description:
        'Optional. Leave this empty and the specification is offered on every ' +
        'product. Name categories and it is only offered on products filed in them — ' +
        'which is what keeps the picker on a product form to a handful of relevant ' +
        'rows rather than the whole list.',
      validation: (rule) => rule.unique(),
    }),

    defineField({
      name: 'browsing',
      title: 'Can visitors narrow the catalogue by this?',
      type: 'string',
      initialValue: 'detail',
      options: {
        layout: 'radio',
        list: [
          { title: 'Yes — offer it as a filter on the catalogue', value: 'filter' },
          { title: 'No — show it in the specification table only', value: 'detail' },
        ],
      },
      description:
        'Filters earn their place by being the questions buyers actually arrive ' +
        'with. A filter panel with fifteen headings is one nobody uses; three or four ' +
        'is one that sells. Free-text specifications cannot be filters — there is no ' +
        'fixed set of answers to offer.',
      hidden: ({ parent }) =>
        (parent as { valueType?: string } | undefined)?.valueType === 'text',
    }),

    defineField({
      name: 'explanation',
      title: 'Explanation',
      type: 'text',
      rows: 2,
      description:
        'Optional, and shown to visitors next to the row. Worth writing for anything ' +
        'abbreviated or industry-specific — "MOQ", "IP rating" — because the buyer ' +
        'reading it may be in procurement rather than engineering.',
      validation: (rule) =>
        rule
          .max(CATALOG_LIMIT.attributeExplanation)
          .warning(
            `Over ${CATALOG_LIMIT.attributeExplanation} characters this is a paragraph ` +
              'inside a table. If it needs that much explaining, it belongs on a page.',
          ),
    }),
  ],

  orderings: [
    {
      name: 'labelAscending',
      title: 'Name, A–Z',
      by: [{ field: 'label', direction: 'asc' }],
    },
  ],

  preview: {
    select: {
      label: 'label',
      valueType: 'valueType',
      unit: 'unit',
      browsing: 'browsing',
    },
    prepare({ label, valueType, unit, browsing }) {
      const kind = specificationKind(valueType)
      const parts = [
        kind?.label ?? 'Kind not set',
        typeof unit === 'string' && unit ? `in ${unit}` : null,
        browsing === 'filter' ? 'used as a filter' : null,
      ].filter(Boolean)

      return {
        title: label || 'Unnamed specification',
        subtitle: parts.join(' · '),
        media: FilterIcon,
      }
    },
  },
})

import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { defineField, defineType, getPublishedId } from 'sanity'

import { toSlug } from '../../shared/slug-field'
import { STUDIO_API_VERSION } from '../../shared/validation'
import { CATALOG_LIMIT } from '../catalog-limits'
import { CATALOG_TYPE } from '../catalog-types'

/** One allowed answer to a specification: "Stainless steel", "BRC", "IP67".
 *
 * ## Why this is a document and not a string in a list
 *
 * Because the whole value of a faceted catalogue rests on two products that are
 * made of stainless steel saying so *identically*. A free string field gives you
 * "Stainless steel", "stainless steel", "Stainless Steel 304" and "S/S" inside a
 * year, and a filter that finds a quarter of the products it should. An array of
 * strings on the specification document fixes the spelling but nothing else: the
 * Studio has no way to offer a dropdown built from another document's array, so
 * the editor would still be typing.
 *
 * As a document it earns four things a list cannot:
 *
 *   - the product form gets a real picker, filtered to this specification;
 *   - renaming "Stainless steel" to "Stainless steel 304" updates every product
 *     at once, because they hold a reference rather than a copy;
 *   - Sanity refuses to delete an answer that products still use, so the
 *     editor finds out *before* the filter empties rather than after;
 *   - the frontend can count how many products carry an answer and leave the
 *     empty ones out of the filter panel.
 *
 * The cost is one more type in the Studio and a deliberate step to add a new
 * answer. That step is the point: a controlled vocabulary that anyone can extend
 * by typing is not controlled. It is reached from inside the specification it
 * belongs to (Catalogue → Specifications → … → Allowed answers), where the
 * "Add" button arrives with the specification already filled in.
 *
 * ## Localisation
 *
 * Same split as `productAttribute`: `label` translates, `key` does not. A German
 * copy of this document keeps the key `stainless-steel`, so a filter shared
 * between locales still resolves.
 */
export const productAttributeOption = defineType({
  name: CATALOG_TYPE.productAttributeOption,
  title: 'Allowed answer',
  type: 'document',
  icon: CheckmarkCircleIcon,

  fields: [
    defineField({
      name: 'attribute',
      title: 'Specification',
      type: 'reference',
      to: [{ type: CATALOG_TYPE.productAttribute }],
      description: 'Which specification this is an answer to.',
      options: {
        disableNew: true,
        /* Only specifications that take a fixed list of answers. A measurement
           has no allowed answers, and an option attached to one would be
           invisible everywhere on the site. */
        filter: 'valueType == "choice"',
      },
      validation: (rule) => [
        rule
          .required()
          .error(
            'Choose the specification this belongs to. An answer on its own is not ' +
              'offered anywhere — no product could ever select it.',
          ),

        rule.custom(async (value, context) => {
          const ref = (value as { _ref?: string } | undefined)?._ref
          if (!ref) return true

          const client = context.getClient({ apiVersion: STUDIO_API_VERSION })
          const attribute = await client.fetch<{
            label?: string | null
            valueType?: string | null
          } | null>('*[_id == $id][0]{label, valueType}', { id: ref })

          if (!attribute?.valueType || attribute.valueType === 'choice') return true

          return (
            `"${attribute.label ?? 'That specification'}" does not take answers from a ` +
            'list — it takes a number or free text — so this answer would never be ' +
            'offered on a product. Point it at a different specification, or change ' +
            'that one to take a list.'
          )
        }),
      ],
    }),

    defineField({
      name: 'label',
      title: 'Answer',
      type: 'string',
      description:
        'As it should read in the specification table and in the filter list — ' +
        '"Stainless steel 304", "BRC", "Organic".',
      validation: (rule) => [
        rule
          .required()
          .error('Write the answer, or it appears as a blank checkbox in the filters.'),
        rule
          .max(CATALOG_LIMIT.optionLabel)
          .warning(
            `Past about ${CATALOG_LIMIT.optionLabel} characters this stops fitting on ` +
              'one line next to a checkbox. If it needs that much, it is a sentence ' +
              'rather than an answer.',
          ),
      ],
    }),

    defineField({
      name: 'key',
      title: 'Key',
      type: 'slug',
      description:
        'Used in the web address when someone filters by this answer. Click Generate ' +
        'once and leave it alone afterwards — changing it breaks filtered links that ' +
        'have already been shared.',
      options: {
        source: 'label',
        maxLength: CATALOG_LIMIT.key,
        slugify: (input: string) => toSlug(input, CATALOG_LIMIT.key),
        isUnique: () => true,
      },
      validation: (rule) => [
        rule
          .required()
          .error('This needs a key. Click Generate to build one from the answer.'),

        /* Unique within its own specification, not across the site. "Standard"
           is a legitimate answer to both Grade and Packaging, and they never
           meet: a filter address names the specification as well as the
           answer. */
        rule.custom(async (value, context) => {
          const current = (value as { current?: string } | undefined)?.current
          const attribute = (
            context.document as { attribute?: { _ref?: string } } | undefined
          )?.attribute?._ref
          if (!current || !attribute) return true

          const self = getPublishedId(context.document?._id ?? '')
          const client = context.getClient({ apiVersion: STUDIO_API_VERSION })

          const ids = await client.fetch<string[]>(
            '*[_type == $type && attribute._ref == $attribute && key.current == $key]._id',
            { type: CATALOG_TYPE.productAttributeOption, attribute, key: current },
          )

          const clash = ids.some((id) => getPublishedId(id) !== self)
          return (
            !clash ||
            `Another answer to this specification already uses the key "${current}". ` +
              'Filtering by one of them would return the other as well. Give this one a ' +
              'different key.'
          )
        }),
      ],
    }),
  ],

  orderings: [
    {
      name: 'labelAscending',
      title: 'Answer, A–Z',
      by: [{ field: 'label', direction: 'asc' }],
    },
  ],

  preview: {
    select: { label: 'label', attribute: 'attribute.label', key: 'key.current' },
    prepare({ label, attribute, key }) {
      return {
        title: label || 'Unnamed answer',
        subtitle: [attribute || 'No specification chosen', key]
          .filter(Boolean)
          .join(' · '),
        media: CheckmarkCircleIcon,
      }
    },
  },
})

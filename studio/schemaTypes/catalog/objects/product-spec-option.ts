import { CheckmarkCircleIcon } from '@sanity/icons/CheckmarkCircle'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { STUDIO_API_VERSION } from '../../shared/validation'
import { CATALOG_TYPE, SPECIFICATION_KINDS } from '../catalog-types'
import { specificationAttributeField } from '../shared/specification-fields'

const KIND = SPECIFICATION_KINDS[1]

/** A specification answered from the list defined for it.
 *
 * This is the row type the catalogue's filters are built out of, and the only
 * one where two products saying the same thing are guaranteed to say it
 * identically — see `documents/product-attribute-option.ts`.
 *
 * ## Why several answers rather than one
 *
 * Because "Certification: BRC, Organic" and "Allergens: gluten, soy" are the
 * normal case in B2B, not the exception. A single-answer field forces an editor
 * into two "Certification" rows, which the duplicate check then rejects — a
 * dead end with no way out. Allowing several costs nothing when there is one.
 *
 * ## The picker is filtered by the specification chosen above it
 *
 * Which means the specification has to be chosen first — stated in the
 * description, because an empty picker with no explanation reads as a broken
 * field. Changing the specification afterwards leaves answers belonging to the
 * old one behind, so the validation below catches that rather than letting the
 * table render a row whose answers have nothing to do with its label.
 */
export const productSpecOption = defineType({
  name: KIND.rowType,
  title: KIND.label,
  type: 'object',
  icon: CheckmarkCircleIcon,
  fields: [
    specificationAttributeField(KIND),

    defineField({
      name: 'values',
      title: 'Answer',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: CATALOG_TYPE.productAttributeOption }],
          options: {
            /* Creating an answer from here would produce one with no
               specification attached, which is invisible everywhere on the
               site. They are added under Catalogue → Specifications, where the
               specification is already known. */
            disableNew: true,
            filter: ({ parent }) => {
              const attribute = (parent as { attribute?: { _ref?: string } } | undefined)
                ?.attribute?._ref
              /* `parent` here is the row when the array is the row's field; when
                 Sanity passes the array itself, fall back to no match rather
                 than to everything — an unfiltered list of every answer on the
                 site is how the wrong one gets picked. */
              return {
                filter: 'attribute._ref == $attribute',
                params: { attribute: attribute ?? null },
              }
            },
          },
        }),
      ],
      description:
        'Choose the specification above first — this list then offers the answers ' +
        'defined for it. Pick as many as apply. If the answer you need is not there, ' +
        'add it under Catalogue → Specifications, so that every product spells it the ' +
        'same way and the filters keep working.',
      validation: (rule) => [
        rule
          .required()
          .min(1)
          .error(
            'Choose at least one answer, or delete this row. A specification with a ' +
              'label and no answer renders as an empty cell, which reads as "none of ' +
              'these apply".',
          ),
        rule.unique(),

        /* The specification was changed after the answers were chosen. Silent
           otherwise: the row keeps rendering, under the wrong label. */
        rule.custom(async (values, context) => {
          if (!Array.isArray(values) || values.length === 0) return true

          const attribute = (
            context.parent as { attribute?: { _ref?: string } } | undefined
          )?.attribute?._ref
          if (!attribute) return true

          const ids = values
            .map((value) => (value as { _ref?: string } | null)?._ref)
            .filter((id): id is string => typeof id === 'string')
          if (ids.length === 0) return true

          const client = context.getClient({ apiVersion: STUDIO_API_VERSION })
          const stray = await client.fetch<string[]>(
            '*[_id in $ids && attribute._ref != $attribute].label',
            { ids, attribute },
          )

          if (stray.length === 0) return true

          return (
            `${stray.join(', ')} ${stray.length === 1 ? 'is an answer' : 'are answers'} to a ` +
            'different specification, so this row would show them under the wrong label. ' +
            'Remove them and choose again from the list.'
          )
        }),
      ],
    }),
  ],

  preview: {
    select: {
      label: 'attribute.label',
      values: 'values',
      first: 'values.0.label',
      second: 'values.1.label',
    },
    prepare({ label, values, first, second }) {
      const count = Array.isArray(values) ? values.length : 0
      const named = [first, second].filter(Boolean).join(', ')
      const answer =
        count === 0
          ? 'No answer yet'
          : count > 2
            ? `${named} and ${count - 2} more`
            : named || `${count} chosen`

      return {
        title: label ? `${label}: ${answer}` : 'No specification chosen',
        subtitle: KIND.label,
        media: CheckmarkCircleIcon,
      }
    },
  },
})

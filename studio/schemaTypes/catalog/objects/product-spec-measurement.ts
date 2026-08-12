import { TagIcon } from '@sanity/icons/Tag'
import { defineField, defineType } from 'sanity'

import { SPECIFICATION_KINDS } from '../catalog-types'
import { specificationAttributeField } from '../shared/specification-fields'

const KIND = SPECIFICATION_KINDS[0]

/** A specification whose answer is a number: 24 (V), 12 (months), 3.5 (kg).
 *
 * Stored as a number and not as text, which is the entire reason this row type
 * exists. "Under 5 kg" as a filter, "lightest first" as a sort and "12" reading
 * the same on every product all need a number; a string can do none of them and
 * looks identical in the Studio.
 *
 * ## Ranges, and why they are one field rather than two rows
 *
 * "Operating temperature: −10 to 60 °C" is one specification with two numbers,
 * not two specifications. `maximum` is optional, so the common case stays a
 * single box, and the frontend renders "−10 – 60" when it is filled in.
 *
 * ## No unit field here
 *
 * The unit belongs to the specification, not to this product's answer to it. Put
 * it here and a client gets "kg" on one product and "Kg" on the next, filters
 * that compare grams with kilogrammes, and a change of unit that means editing
 * five hundred documents.
 */
export const productSpecMeasurement = defineType({
  name: KIND.rowType,
  title: KIND.label,
  type: 'object',
  icon: TagIcon,
  fields: [
    specificationAttributeField(KIND),

    defineField({
      name: 'value',
      title: 'Value',
      type: 'number',
      description:
        'Numbers only — the unit comes from the specification itself and is added ' +
        'automatically. Use a full stop for decimals.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Enter the value, or delete this row. A specification with a label and no ' +
              'number renders as an empty cell, which reads as "not applicable" rather ' +
              'than "not filled in yet".',
          ),
    }),

    defineField({
      name: 'maximum',
      title: 'Up to',
      type: 'number',
      description:
        'Optional. Fill this in only when the specification is genuinely a range — ' +
        '"10 to 15 mm". Leave it empty for a single figure.',
      validation: (rule) =>
        rule.custom((maximum, context) => {
          if (typeof maximum !== 'number') return true

          const value = (context.parent as { value?: unknown } | undefined)?.value
          if (typeof value !== 'number') {
            return 'Fill in the value first — this box is the top of a range that starts there.'
          }
          if (maximum > value) return true

          return `A range has to end above where it starts. This one reads "${value} to ${maximum}".`
        }),
    }),
  ],

  preview: {
    select: {
      label: 'attribute.label',
      unit: 'attribute.unit',
      value: 'value',
      maximum: 'maximum',
    },
    prepare({ label, unit, value, maximum }) {
      const range =
        typeof value === 'number'
          ? typeof maximum === 'number'
            ? `${value}–${maximum}`
            : `${value}`
          : 'No value yet'

      return {
        title: label
          ? `${label}: ${range}${unit ? ` ${unit}` : ''}`
          : 'No specification chosen',
        subtitle: KIND.label,
        media: TagIcon,
      }
    },
  },
})

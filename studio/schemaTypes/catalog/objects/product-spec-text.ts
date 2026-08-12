import { BlockContentIcon } from '@sanity/icons/BlockContent'
import { defineField, defineType } from 'sanity'

import { SPECIFICATION_KINDS } from '../catalog-types'
import { specificationAttributeField } from '../shared/specification-fields'

const KIND = SPECIFICATION_KINDS[2]

/** A specification whose answer is a few words, written freely.
 *
 * The escape hatch, and it is here on purpose. A model with no escape hatch gets
 * abused in a worse way — the client puts "Origin: Netherlands (harvest
 * dependent)" into a measurement's unit field, or gives up on the table and
 * writes the whole thing into the description.
 *
 * It is also the row that quietly undoes the model if it becomes the default, so
 * the wording on the field and on the specification's own radio list both push
 * back: this answer cannot be filtered, cannot be sorted, and two products
 * saying the same thing in slightly different words will not be found together.
 * If a value repeats across products, it wants to be an Option; if it is a
 * quantity, it wants to be a Measurement.
 *
 * Length is capped low, and that cap is doing real work. The failure mode of a
 * text specification is a paragraph in a table cell.
 */
export const productSpecText = defineType({
  name: KIND.rowType,
  title: KIND.label,
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    specificationAttributeField(KIND),

    defineField({
      name: 'value',
      title: 'Answer',
      type: 'string',
      description:
        'A few words. If you find yourself typing the same answer on several ' +
        'products, it should be an Option instead — those can be filtered and stay ' +
        'spelled the same. If it is a quantity, it should be a Measurement.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Write the answer, or delete this row. A label with an empty cell beside it ' +
              'reads as "does not apply" rather than "not filled in yet".',
          ),
        rule
          .max(120)
          .warning(
            'Past about 120 characters this is a sentence in a table cell, and it ' +
              'stretches the row past everything around it. Put the detail in the ' +
              'description or a datasheet.',
          ),
      ],
    }),
  ],

  preview: {
    select: { label: 'attribute.label', value: 'value' },
    prepare({ label, value }) {
      return {
        title: label ? `${label}: ${value || '—'}` : 'No specification chosen',
        subtitle: KIND.label,
        media: BlockContentIcon,
      }
    },
  },
})

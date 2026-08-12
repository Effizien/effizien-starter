import { ComponentIcon } from '@sanity/icons/Component'
import type { Path, ValidationError } from 'sanity'
import { defineField, defineType } from 'sanity'

import { hasText } from '../../shared/validation'
import { CATALOG_LIMIT } from '../catalog-limits'
import { specificationsField } from '../shared/specification-fields'

/** The same product in a different size, pack, finish or grade.
 *
 * ## Why variants are nested and not documents
 *
 * A pack size is not a thing anyone browses, links to, or writes a description
 * for. It has no page, no address, and no life outside the product that offers
 * it — which is the whole of the objects-versus-references test in the schema
 * rules, all pointing one way. Making each variant a document turns five hundred
 * products into three thousand documents, drowns every list and every search in
 * near-identical rows, and turns reordering into a numeric field.
 *
 * The one thing a document would buy is a variant of its own URL. A catalogue
 * with no checkout does not need one: the visitor enquires about the product and
 * names the variant, so a variant needs to be *identifiable* in an enquiry, not
 * *addressable* on the web. Its `_key` — which Sanity maintains and which
 * survives reordering — plus its article number does that.
 *
 * ## Only what differs
 *
 * The specifications here are overrides, not a second table. The frontend merges
 * the product's rows with these, variant winning, so a 10 kg carton lists the
 * product's twelve specifications and its own weight. Repeating all twelve on
 * every variant is how a catalogue's data goes stale in three places at once.
 */

/** Path to an array member the Studio can point a marker at. */
const pathToItem = (key: unknown): Path =>
  typeof key === 'string' && key.length > 0 ? [{ _key: key }] : []

type VariantRow = { _key?: unknown; name?: unknown; articleNumber?: unknown }

/** Two variants of one product sharing an article number.
 *
 * Checked within the product rather than across the dataset on purpose: this is
 * the mistake that actually happens (a variant duplicated and half-edited), it
 * is cheap to catch without a query, and it is the one that breaks an enquiry —
 * sales receives a code that matches two things.
 */
export const describeDuplicateArticleNumbers = (
  value: unknown,
): true | ValidationError => {
  if (!Array.isArray(value)) return true

  const seen = new Set<string>()

  for (const variant of value as VariantRow[]) {
    const code =
      typeof variant?.articleNumber === 'string' ? variant.articleNumber.trim() : ''
    if (!code) continue

    if (seen.has(code)) {
      return {
        message:
          `Two variants share the article number "${code}". An enquiry names the code ` +
          'and nothing else, so sales would have no way of telling which one the ' +
          'customer meant. Give this one its own code.',
        path: pathToItem(variant._key),
      }
    }

    seen.add(code)
  }

  return true
}

export const productVariant = defineType({
  name: 'productVariant',
  title: 'Variant',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description:
        'What tells this one apart, in the customer’s words — "10 kg carton", "1.5 m, ' +
        'left-hand thread". Not the whole product name again.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Name this variant. Unnamed, it appears in the list on the product page as ' +
              'a bare code, and in an enquiry as a line the customer cannot check.',
          ),
    }),

    defineField({
      name: 'articleNumber',
      title: 'Article number',
      type: 'string',
      description:
        'The code you use for this exact variant. It is what an enquiry is placed ' +
        'against, so it has to match what your own systems expect.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every variant needs its own article number. Without one an enquiry ' +
              'arrives naming a product and a size, and somebody has to work out which ' +
              'line that is.',
          ),
        rule.custom((value) => {
          if (!hasText(value)) return true
          if (value === value.trim()) return true
          return 'Remove the spaces at the start or end — they travel into the enquiry and into any export, where they stop the code matching.'
        }),
        rule
          .max(CATALOG_LIMIT.articleNumber)
          .warning(
            `Over ${CATALOG_LIMIT.articleNumber} characters this is probably a ` +
              'description rather than a code.',
          ),
      ],
    }),

    specificationsField({
      title: 'What differs',
      max: CATALOG_LIMIT.variantSpecifications,
      description:
        'Only the specifications that are different for this variant — usually its ' +
        'size or weight. Everything else is inherited from the product, so there is ' +
        'no need to repeat it, and repeating it means two places to update.',
    }),

    defineField({
      name: 'image',
      title: 'Photograph',
      type: 'mediaImage',
      description:
        'Optional, and only worth adding when this variant actually looks different. ' +
        'The product’s own photographs are used otherwise.',
    }),
  ],

  preview: {
    select: {
      name: 'name',
      articleNumber: 'articleNumber',
      specifications: 'specifications',
      media: 'image',
    },
    prepare({ name, articleNumber, specifications, media }) {
      const differences = Array.isArray(specifications) ? specifications.length : 0
      return {
        title: name || 'Unnamed variant',
        subtitle: [
          articleNumber || 'No article number',
          differences > 0
            ? `${differences} ${differences === 1 ? 'difference' : 'differences'}`
            : null,
        ]
          .filter(Boolean)
          .join(' · '),
        media: media ?? ComponentIcon,
      }
    },
  },
})

import type { Path, ValidationError } from 'sanity'
import { defineArrayMember, defineField } from 'sanity'

import { STUDIO_API_VERSION } from '../../shared/validation'
import { CATALOG_LIMIT } from '../catalog-limits'
import {
  CATALOG_TYPE,
  SPECIFICATION_KINDS,
  type SpecificationKind,
  specificationKind,
} from '../catalog-types'

/** The parts of the specification model that more than one type needs.
 *
 * Shared as field *definitions* rather than copied, so that "how does an editor
 * add a specification" has one answer whether they are on a product or on one of
 * its variants — and so a client who wants different wording changes it once.
 */

/** Path to an array member the Studio can point a marker at. */
const pathToItem = (key: unknown): Path =>
  typeof key === 'string' && key.length > 0 ? [{ _key: key }] : []

type ProductLike = { category?: { _ref?: string } }
type ReferenceValue = { _ref?: string }

/** The reference to the specification this row fills in.
 *
 * ## The filter is the whole design
 *
 * Two things narrow the list, and between them they turn a picker over sixty
 * site-wide specifications into one showing the eight that could possibly be
 * right:
 *
 *   1. **Kind.** A measurement row only offers specifications that take a
 *      number. This is what makes the three row types worth having: the wrong
 *      pairing is not something an editor can build, so there is no error
 *      message to write and no half-filled row to clean up later.
 *   2. **Category.** A specification may declare the categories it applies to.
 *      Voltage belongs to power supplies, not to cable ties.
 *
 * The category half deliberately fails *open*. A specification with no
 * categories is offered everywhere, and a product with no category yet sees
 * everything. A filter that hides the row an editor came to add is worse than no
 * filter at all — it produces "the specification I need has disappeared", which
 * has no discoverable fix.
 *
 * ## Why the value fields are not here
 *
 * They differ per kind, which is the point. What they share is this reference
 * and the pair of rules under it.
 */
export function specificationAttributeField(kind: SpecificationKind) {
  return defineField({
    name: 'attribute',
    title: 'Specification',
    type: 'reference',
    to: [{ type: CATALOG_TYPE.productAttribute }],
    description:
      `Which row of the specification table this fills in. The list offers the ` +
      `specifications recorded as "${kind.label}" — and, once this product has a ` +
      `category, the ones that apply to it. If what you want is missing, it is ` +
      `probably recorded as a different kind: check under Catalogue → ` +
      `Specifications.`,
    options: {
      /* Creating a specification from inside a product is how a site ends up
         with "Weight", "weight" and "Nett weight" as three unrelated rows that
         can never be compared or filtered. A controlled vocabulary is only
         controlled if adding to it is deliberate. */
      disableNew: true,
      filter: ({ document }) => {
        const category = (document as ProductLike | undefined)?.category?._ref ?? null
        return {
          filter:
            'valueType == $valueType && (!defined($category) || !defined(categories) || ' +
            'count(categories) == 0 || $category in categories[]._ref)',
          params: { valueType: kind.valueType, category },
        }
      },
    },
    validation: (rule) => [
      rule
        .required()
        .error(
          'Choose which specification this row records. A row with no specification ' +
            'has no label, so it renders as a value in a table with nothing in the ' +
            'left-hand column.',
        ),

      /* The specification was changed to a different kind after this row was
         written. Rare, and silent otherwise: the row still holds a perfectly
         valid number that the table can no longer label. Checked here rather
         than only on the specification document because this is where the fix
         is, and because it catches variant rows the other check cannot see. */
      rule.custom(async (value, context) => {
        const ref = (value as ReferenceValue | undefined)?._ref
        if (!ref) return true

        const client = context.getClient({ apiVersion: STUDIO_API_VERSION })
        const attribute = await client.fetch<{
          label?: string | null
          valueType?: string | null
        } | null>('*[_id == $id][0]{label, valueType}', { id: ref })

        if (!attribute?.valueType || attribute.valueType === kind.valueType) return true

        const actual = specificationKind(attribute.valueType)
        const name = attribute.label ? `"${attribute.label}"` : 'This specification'
        return (
          `${name} is now recorded as ${actual ? `an "${actual.label}"` : 'a different kind'}, ` +
          `so it cannot hold ${kind.label === 'Measurement' ? 'a measurement' : `a ${kind.label.toLowerCase()} value`} ` +
          `any more and this row will not appear in the table. Delete this row and add ` +
          `${actual ? `an "${actual.label}"` : 'the right kind of'} row instead.`
        )
      }),
    ],
  })
}

type SpecificationRow = {
  _key?: unknown
  attribute?: { _ref?: unknown }
}

/** One specification filled in twice.
 *
 * `rule.unique()` will not catch it: two rows naming the same specification with
 * different values are different objects, and Sanity is comparing objects. The
 * page renders both, one above the other, and whichever the reader believes is a
 * coin toss.
 */
export const describeDuplicateSpecifications = (
  value: unknown,
): true | ValidationError => {
  if (!Array.isArray(value)) return true

  const seen = new Set<string>()

  for (const row of value as SpecificationRow[]) {
    const ref = typeof row?.attribute?._ref === 'string' ? row.attribute._ref : undefined
    if (!ref) continue

    if (seen.has(ref)) {
      return {
        message:
          'This specification is filled in twice. The table would show both rows, one ' +
          'under the other, and there is no way for a reader to tell which is current. ' +
          'Delete one of them, or point this row at a different specification.',
        path: pathToItem(row._key),
      }
    }

    seen.add(ref)
  }

  return true
}

/** The specification table, as a field.
 *
 * Used by `product` for the product's own specifications and by `productVariant`
 * for the handful that differ on one variant. Identical shape on purpose: the
 * frontend merges the two by attribute id, variant winning, and an editor who
 * has learned one has learned both.
 */
export function specificationsField(options: {
  name?: string
  title?: string
  description: string
  group?: string
  max?: number
}) {
  const max = options.max ?? CATALOG_LIMIT.specifications

  return defineField({
    name: options.name ?? 'specifications',
    title: options.title ?? 'Specifications',
    type: 'array',
    group: options.group,
    description: options.description,
    of: SPECIFICATION_KINDS.map((kind) => defineArrayMember({ type: kind.rowType })),
    validation: (rule) => [
      rule.custom(describeDuplicateSpecifications),
      rule
        .max(max)
        .warning(
          `Past about ${max} rows a specification table stops being read and starts ` +
            'being scrolled past, and the two or three rows that decide a purchase are ' +
            'buried in the middle of it. Keep the ones a buyer chooses on and put the ' +
            'rest in a datasheet under Downloads.',
        ),
    ],
  })
}

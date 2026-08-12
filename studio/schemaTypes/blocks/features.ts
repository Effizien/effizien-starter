import { ThLargeIcon } from '@sanity/icons/ThLarge'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { sectionFields } from '../shared/section-fields'
import { SECTION_LIMIT } from '../shared/section-limits'
import { describeCount, previewText } from '../shared/section-preview'

/** A set of things, presented as a set.
 *
 *  Services on a marketing site, categories on a catalogue, guides on a
 *  documentation index, steps in a process, reasons to choose someone. They are
 *  all the same content shape — several named things, each with a sentence, some
 *  with a link — and they are one block rather than five because the difference
 *  between them is the heading above them, which is a field.
 *
 *  This is the block that decides whether the library stays at six types or
 *  drifts to twenty. Every "can we have a services block" request is this block
 *  with `heading: 'Our services'`, and every one that is genuinely not — because
 *  the items need fields these do not have — is a new document type with a real
 *  editing screen, not another page-builder variant.
 *
 *  ## Why `features` and not `featureGrid`
 *
 *  Three columns on a laptop is two on a tablet and one on a phone, so the name
 *  would be wrong on most of the devices reading it, and wrong permanently after
 *  the first redesign. The layout is the front end's problem; the content is a
 *  list of features either way. */
export const features = defineType({
  name: 'features',
  title: 'List of items',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    ...sectionFields,

    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [defineArrayMember({ type: 'featureItem' })],
      description:
        'Drag to reorder. Aim for an even set — three or four items of similar length read as a considered list; seven of wildly different lengths read as whatever was to hand.',
      validation: (rule) => [
        rule
          .min(SECTION_LIMIT.listItemsMin)
          .error(
            `A list needs at least ${SECTION_LIMIT.listItemsMin} items. A single item laid out as a list looks like the other ones failed to load — if there is only one thing to say, say it in a text section.`,
          ),
        rule
          .max(SECTION_LIMIT.listItemsMax)
          .warning(
            `Past ${SECTION_LIMIT.listItemsMax} items nobody reads to the bottom, and the section has become a page. Split it, or give the items a page of their own and link to it.`,
          ),
      ],
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      intro: 'intro',
      items: 'items',
      firstItem: 'items.0.heading',
    },
    prepare({ heading, intro, items, firstItem }) {
      return {
        title:
          previewText(heading) ||
          previewText(intro) ||
          previewText(firstItem) ||
          'List of items',
        subtitle: `List · ${describeCount(items, 'item', 'items')}`,
        media: ThLargeIcon,
      }
    },
  },
})

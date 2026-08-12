import { defineField, defineType } from 'sanity'

import { SECTION_LIMIT } from '../shared/section-limits'
import { previewText } from '../shared/section-preview'

/** One item in a features list.
 *
 *  What it is depends on the site — a service, a benefit, a product category, a
 *  step in a process, a guide in a documentation index. All of them are "a named
 *  thing with a sentence about it and somewhere to read more", and modelling
 *  them as one type is what stops the block library growing a `services` block,
 *  a `benefits` block and a `steps` block that differ only in the heading above
 *  them.
 *
 *  ## No icon field
 *
 *  The obvious next field is an icon picker. It is left out deliberately: an
 *  icon list is part of the design system, so a field holding icon *names*
 *  couples the content to one build of the front end and breaks silently when
 *  the icon set is swapped. Where an item genuinely needs a picture, it has an
 *  image, with the same description requirement as every other image here. */
export const featureItem = defineType({
  name: 'featureItem',
  title: 'Item',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Name',
      type: 'string',
      description: 'What this one is called. A few words — these sit side by side.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Give this item a name. Items in a list are read as a set, and an unnamed one reads as a gap.',
          ),
        rule
          .max(SECTION_LIMIT.itemHeading)
          .warning(
            `Past about ${SECTION_LIMIT.itemHeading} characters this one will be noticeably taller than the others next to it.`,
          ),
      ],
    }),

    defineField({
      name: 'body',
      title: 'Description',
      type: 'text',
      rows: 3,
      description:
        'A sentence or two. Keep the length of these roughly even — a list where one item has a paragraph and the rest have a line reads as a mistake.',
      validation: (rule) =>
        rule
          .max(SECTION_LIMIT.itemBody)
          .warning(
            `Over ${SECTION_LIMIT.itemBody} characters this is longer than the space these are laid out in. If it needs this much explaining, it wants a page of its own with a link to it below.`,
          ),
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'mediaImage',
      description:
        'Optional. Use images on all of these or none of them — a set where some have pictures and some do not looks unfinished.',
    }),

    defineField({
      name: 'link',
      title: 'Read more',
      type: 'action',
      description:
        'Optional. Where someone goes to find out more about this one. Give each a label naming its destination rather than "Learn more" — a screen reader user listing the links on this page would otherwise get four identical entries.',
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      body: 'body',
      media: 'image',
    },
    prepare({ heading, body, media }) {
      return {
        title: previewText(heading) || 'Unnamed item',
        subtitle: previewText(body, 60),
        media,
      }
    },
  },
})

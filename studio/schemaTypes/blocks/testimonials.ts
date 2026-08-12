import { CommentIcon } from '@sanity/icons/Comment'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { sectionFields } from '../shared/section-fields'
import { describeCount, previewText } from '../shared/section-preview'

/** What other people say. Evidence, in their words.
 *
 *  Kept separate from a list of items because the parts are not
 *  interchangeable: a quote has a speaker, and the speaker is what makes the
 *  quote worth anything. Modelling it as name-plus-description would let an
 *  editor put the quote in the name field and the attribution in the
 *  description, which renders as a heading made of somebody's sentence — and
 *  publishes as structured data with the wrong author.
 *
 *  ## One is allowed
 *
 *  Unlike the other list blocks, the minimum here is one. A single well-attributed
 *  quote in the right place on a page is a legitimate and common thing; padding it
 *  out to two to satisfy a validation rule is how sites end up quoting the
 *  founder's cousin. */
export const testimonials = defineType({
  name: 'testimonials',
  title: 'Quotes',
  type: 'object',
  icon: CommentIcon,
  fields: [
    ...sectionFields,

    defineField({
      name: 'items',
      title: 'Quotes',
      type: 'array',
      of: [defineArrayMember({ type: 'testimonial' })],
      description:
        'The strongest one first. Quotes from people whose situation matches the reader’s beat quotes from the most impressive name.',
      validation: (rule) => [
        rule
          .min(1)
          .error(
            'Add at least one quote, or delete this section — an empty quotes section renders as a blank band on the page.',
          ),
        rule
          .max(6)
          .warning(
            'Past about six, quotes stop being evidence and start being a wall nobody reads. Keep the ones that answer a real objection.',
          ),
      ],
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      items: 'items',
      firstQuote: 'items.0.quote',
      firstName: 'items.0.name',
    },
    prepare({ heading, items, firstQuote, firstName }) {
      const fallback = previewText(firstQuote, 60)
      const attributed = fallback && firstName ? `${fallback} — ${firstName}` : fallback
      return {
        title: previewText(heading) || attributed || 'Quotes',
        subtitle: `Quotes · ${describeCount(items, 'quote', 'quotes')}`,
        media: CommentIcon,
      }
    },
  },
})

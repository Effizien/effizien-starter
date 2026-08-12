import { HelpCircleIcon } from '@sanity/icons/HelpCircle'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { sectionFields } from '../shared/section-fields'
import { SECTION_LIMIT } from '../shared/section-limits'
import { describeCount, previewText } from '../shared/section-preview'

/** Questions people actually ask, with answers.
 *
 *  It is a separate block from a list of items — rather than a features list with
 *  the question in the name field — for one reason: a question paired with its
 *  answer is a shape search engines understand. The front end emits `FAQPage`
 *  JSON-LD from these fields, built from the same data the page renders, which is
 *  the only way structured data stays true over time. Flattening the pair into
 *  generic name-and-description would throw that away and there would be no sign
 *  anything had been lost.
 *
 *  This is also the block that most repays being written honestly. An FAQ full of
 *  questions nobody asked ("Why choose us?") is marketing copy wearing a question
 *  mark; an FAQ built from what the client's inbox actually receives answers the
 *  thing that would otherwise have been an email, and matches what people type
 *  into a search box. */
export const faqs = defineType({
  name: 'faqs',
  title: 'Questions and answers',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [
    ...sectionFields,

    defineField({
      name: 'items',
      title: 'Questions',
      type: 'array',
      of: [defineArrayMember({ type: 'faqItem' })],
      description:
        'Most-asked first. People stop reading a list of questions much sooner than you would expect, so the one that actually blocks a decision goes at the top.',
      validation: (rule) => [
        rule
          .min(SECTION_LIMIT.listItemsMin)
          .error(
            `Add at least ${SECTION_LIMIT.listItemsMin} questions. A section headed "Frequently asked questions" containing one question undermines the page rather than helping it.`,
          ),
        rule
          .max(SECTION_LIMIT.listItemsMax)
          .warning(
            `Past ${SECTION_LIMIT.listItemsMax} questions this has stopped being a section and become a support page — which is fine, but it should be a page, linked from here.`,
          ),
      ],
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      items: 'items',
      firstQuestion: 'items.0.question',
    },
    prepare({ heading, items, firstQuestion }) {
      return {
        title:
          previewText(heading) || previewText(firstQuestion) || 'Questions and answers',
        subtitle: `Questions · ${describeCount(items, 'question', 'questions')}`,
        media: HelpCircleIcon,
      }
    },
  },
})

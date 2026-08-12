import { defineField, defineType } from 'sanity'

import { previewText } from '../shared/section-preview'

/** One question and its answer.
 *
 *  ## This is structured data, not just a page section
 *
 *  A question and its answer, kept in separate fields, is exactly the shape
 *  Google's FAQ rich result wants — the front end emits `FAQPage` JSON-LD built
 *  from these two fields and the page renders from the same data, so the markup
 *  cannot drift from what a visitor sees. That only works while the question is
 *  a question and the answer is an answer. An editor who writes the question
 *  into the answer field as bold text gets a page that looks right and structured
 *  data that is wrong, and nothing anywhere says so.
 *
 *  ## Inline, not a reusable document
 *
 *  These are objects inside the block, not references to a shared `faq`
 *  document. Most FAQ content is written for the page it is on and read
 *  nowhere else, and a reference costs the editor a second screen for every
 *  question. The trade is that the same question appearing on three pages is
 *  three copies to keep in step; when that starts happening, promote `faqItem`
 *  to a document type and switch this array to references. That is a migration,
 *  so it is a decision worth making on evidence rather than in advance. */
export const faqItem = defineType({
  name: 'faqItem',
  title: 'Question',
  type: 'object',
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      description:
        'Write it the way someone would ask it — "How long does a project take?", not "Project timescales". People search in questions, and this is the text Google shows if this page earns a rich result.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every entry needs a question. Without one the answer appears under a blank heading, and the page cannot produce valid FAQ data for search engines.',
          ),
        rule
          .custom((question) => {
            if (typeof question !== 'string' || question.trim().length === 0) return true
            if (question.trim().endsWith('?')) return true
            return 'This does not read as a question. FAQ entries are matched against what people actually type into a search box, and a label like "Pricing" matches nothing — "How much does it cost?" matches a great deal.'
          })
          .warning(),
      ],
    }),

    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'simpleRichText',
      description:
        'Answer it in the first sentence, then explain. There are no headings in here on purpose — an answer that needs headings is a page, and this should link to it.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Add an answer. A question with none of it published leaves the visitor exactly where they started, and search engines drop the whole FAQ block when any entry is incomplete.',
          ),
    }),
  ],
  preview: {
    select: {
      question: 'question',
      answer: 'answer',
    },
    prepare({ question, answer }) {
      return {
        title: previewText(question) || 'No question yet',
        subtitle: previewText(answer, 70) || 'No answer yet',
      }
    },
  },
})

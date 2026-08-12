import { defineField, defineType } from 'sanity'

import { SECTION_LIMIT } from '../shared/section-limits'
import { previewText } from '../shared/section-preview'

/** Something a real person said, and who said it.
 *
 *  ## Attribution is required, and that is a content decision
 *
 *  An unattributed quote is worth nothing to a reader — it reads as copy the
 *  agency wrote — and it cannot be published as `Review` structured data,
 *  because the schema.org type requires an author. Making the name required is
 *  the cheapest available way to stop a site filling up with anonymous praise.
 *  If a client genuinely cannot name someone, the honest field value is the
 *  organisation, and that is a sentence worth having with them rather than a
 *  validation rule worth relaxing.
 *
 *  ## Plain text, not rich text
 *
 *  A quote is what somebody said. Links and headings inside it are the site
 *  editorialising over the top of a person's words, and plain text is also what
 *  structured data needs — no `pt::text()` in the query, no chance of the markup
 *  and the visible quote disagreeing. */
export const testimonial = defineType({
  name: 'testimonial',
  title: 'Quote',
  type: 'object',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 4,
      description:
        'Their words, not a paraphrase. Leave the quotation marks off — the page adds them.',
      validation: (rule) => [
        rule.required().error('Add the quote. Without it there is nothing to show.'),
        rule
          .max(SECTION_LIMIT.quote)
          .warning(
            `Over ${SECTION_LIMIT.quote} characters this stops being a quote and becomes a case study — nobody reads to the end of it in a band across the page. Cut it to the sentence that does the work, or link to the full story.`,
          ),
      ],
    }),

    defineField({
      name: 'name',
      title: 'Who said it',
      type: 'string',
      description: 'Their name, as they would want it written.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Name the person. An anonymous quote reads as marketing copy rather than evidence, and it cannot be published as a review that search engines will show.',
          ),
    }),

    defineField({
      name: 'context',
      title: 'Role and organisation',
      type: 'string',
      description:
        'Optional but close to essential — "Operations Director, Meridian Health". This is what tells a reader whether the person is like them.',
    }),

    defineField({
      name: 'portrait',
      title: 'Photograph',
      type: 'mediaImage',
      description:
        'Optional. A real photograph of the person who said it. If you only have some of them, use none — a set of quotes where two have faces and three have initials looks like the two are the real ones.',
    }),
  ],
  preview: {
    select: {
      quote: 'quote',
      name: 'name',
      context: 'context',
      media: 'portrait',
    },
    prepare({ quote, name, context, media }) {
      const attribution = [name, context].filter(Boolean).join(' — ')
      return {
        title: previewText(quote) || 'No quote yet',
        subtitle: attribution || 'Not attributed',
        media,
      }
    },
  },
})

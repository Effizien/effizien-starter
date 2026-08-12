import { StarIcon } from '@sanity/icons/Star'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { SECTION_LIMIT } from '../shared/section-limits'
import { describeCount, previewText } from '../shared/section-preview'

/** The section that opens a page and says what it is for.
 *
 *  ## Why this one is different from the other five
 *
 *  Its heading is required, and `pageBuilder` will not let it sit anywhere but
 *  the top. Both fall out of the same fact: this is the block the renderer takes
 *  the page's main heading from. Everything else in the library is optional
 *  furniture that can appear anywhere, any number of times.
 *
 *  ## "Hero" is a layout word — why keep it?
 *
 *  Because it survives the test that matters: redesign the site and a page still
 *  opens with a statement of what it is for. The name describes the job (open the
 *  page) rather than the appearance (full-bleed image with centred text over it),
 *  and every editor in the industry already knows the word. `bigHeroText` would
 *  fail; `hero` with a field called `heading` does not.
 *
 *  ## Alignment is the one presentational field in the library
 *
 *  It is here and nowhere else, and it stores `start`/`center` rather than
 *  `left`/`right`. Logical values, so that adding a right-to-left locale later
 *  is a CSS change instead of a data migration — `start` is the left edge in
 *  English and the right edge in Arabic, and the content does not have to know
 *  which. The front end maps it through a helper (see
 *  `src/lib/page-builder/alignment.ts`) rather than interpolating it into a class
 *  name, because the value arrives from a live-editing session carrying invisible
 *  stega characters and `text-${alignment}` produces a class that does not
 *  exist. */
export const hero = defineType({
  name: 'hero',
  title: 'Opening section',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description:
        'What this page is for, in one line. This is the page’s main heading — the biggest single signal to a visitor and to a search engine about what they have landed on. Say what the page offers, not what the company is called.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'The opening section needs a heading. It is the page’s main heading: without it the page has none, which breaks how screen readers navigate it and how search engines classify it.',
          ),
        rule
          .max(SECTION_LIMIT.heading)
          .warning(
            `Past about ${SECTION_LIMIT.heading} characters this is a paragraph in heading clothing. The line underneath is where the detail goes.`,
          ),
      ],
    }),

    defineField({
      name: 'lede',
      title: 'Introduction',
      type: 'text',
      rows: 3,
      description:
        'Optional. One or two sentences under the heading. Written well, this is also what search engines and social platforms fall back to when no description is set under Search & sharing — so write it for someone who has not seen the page yet.',
      validation: (rule) =>
        rule
          .max(SECTION_LIMIT.intro)
          .warning(
            `Over ${SECTION_LIMIT.intro} characters this will be cut off where it is reused as a search description, and few people read past the second sentence here anyway.`,
          ),
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'mediaImage',
      description:
        'Optional. This is usually the largest image on the page and the one that decides how fast the page appears to load, so prefer a photograph that means something over a stock image that fills space.',
    }),

    defineField({
      name: 'actions',
      title: 'Buttons',
      type: 'array',
      of: [defineArrayMember({ type: 'action' })],
      description:
        'Optional. The one or two things you want someone to do from here. If there are two, the first is the one you actually want.',
      validation: (rule) =>
        rule
          .max(SECTION_LIMIT.actions)
          .error(
            `Two buttons at most. Past ${SECTION_LIMIT.actions} choices at one decision point, fewer people take any of them — and the design has room for a primary and a secondary, not a menu.`,
          ),
    }),

    defineField({
      name: 'alignment',
      title: 'Text alignment',
      type: 'string',
      description:
        'Centred suits a short heading with no image. Anything longer than a line is easier to read aligned to the start.',
      options: {
        list: [
          { title: 'Aligned to the start', value: 'start' },
          { title: 'Centred', value: 'center' },
        ],
        layout: 'radio',
      },
      initialValue: 'start',
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      lede: 'lede',
      actions: 'actions',
      media: 'image',
    },
    prepare({ heading, lede, actions, media }) {
      const buttons = Array.isArray(actions) && actions.length > 0
      return {
        title:
          previewText(heading) || previewText(lede) || 'Opening section — no heading yet',
        subtitle: buttons
          ? `Opening section · ${describeCount(actions, 'button', 'buttons')}`
          : 'Opening section',
        media: media ?? StarIcon,
      }
    },
  },
})

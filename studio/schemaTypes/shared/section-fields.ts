import { defineField } from 'sanity'

import { SECTION_LIMIT } from './section-limits'

/** The two fields every section that can announce itself shares.
 *
 *  Shared as field definitions rather than copied, so that "what does the heading
 *  field say" has one answer across the block library. An editor who learns how
 *  the heading behaves on one block has learned it for all of them, and a client
 *  who wants different wording changes it once.
 *
 *  Hero and call to action deliberately do *not* use these: their headings are
 *  required and their copy is specific to the job those blocks do. */

/** Optional on purpose.
 *
 *  A features grid directly under a hero that already introduced it does not want
 *  a heading — forcing one produces "Features" above four obvious features, which
 *  is a heading that exists to satisfy a validation rule rather than to help
 *  anyone. When it is absent the renderer shifts everything inside the section up
 *  a level, so the outline stays intact either way. See
 *  `shared/heading-outline.ts`. */
export const sectionHeadingField = defineField({
  name: 'heading',
  title: 'Heading',
  type: 'string',
  description:
    'Optional. Give this section a heading when it starts a new idea; leave it empty when it continues the section above. Headings are how people scanning the page find what they came for, and the only way someone using a screen reader can jump around it.',
  validation: (rule) =>
    rule
      .max(SECTION_LIMIT.heading)
      .warning(
        `Past about ${SECTION_LIMIT.heading} characters this stops working as a signpost — it is a sentence, and people scanning the page skip it. Say what the section is about in a few words and put the rest in the introduction below.`,
      ),
})

/** The paragraph between a section heading and the section's contents. */
export const sectionIntroField = defineField({
  name: 'intro',
  title: 'Introduction',
  type: 'text',
  rows: 3,
  description:
    'Optional. One or two sentences setting up what follows. Plain text — if it needs links or formatting, it wants to be a text section instead.',
  validation: (rule) =>
    rule
      .max(SECTION_LIMIT.intro)
      .warning(
        `Over ${SECTION_LIMIT.intro} characters this is no longer an introduction to the section, it is the section. Add a text section above this one instead.`,
      ),
})

/** Spread into a block's `fields` to get both, in the right order. */
export const sectionFields = [sectionHeadingField, sectionIntroField]

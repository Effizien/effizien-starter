import { RocketIcon } from '@sanity/icons/Rocket'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { SECTION_LIMIT } from '../shared/section-limits'
import { describeCount, previewText } from '../shared/section-preview'

/** The point of the page, stated plainly, with a way to act on it.
 *
 *  Every other block informs. This one asks. It exists as its own type rather
 *  than as "a text section with buttons" because the ask is the one part of a
 *  page whose wording, placement and count of options are worth constraining:
 *  the heading is required, and there are at most two buttons, and both of those
 *  are rules about conversion rather than about layout.
 *
 *  ## Buttons here are required; on a hero they are not
 *
 *  A hero without buttons is a page that introduces itself and lets you read on.
 *  A call to action without buttons is a sentence asking you to do something with
 *  no way to do it — the section has no other purpose, so an empty one is always
 *  a mistake rather than a choice. */
export const callToAction = defineType({
  name: 'callToAction',
  title: 'Call to action',
  type: 'object',
  icon: RocketIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description:
        'The ask, in the reader’s terms — "Talk to us about your project", not "Contact". Say what they get, not what they have to do.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'This section needs a heading. It is the sentence that persuades someone to press the button; without it there are buttons floating in a band with no reason to press them.',
          ),
        rule
          .max(SECTION_LIMIT.heading)
          .warning(
            `Past about ${SECTION_LIMIT.heading} characters the ask gets lost. Put the detail in the line underneath.`,
          ),
      ],
    }),

    defineField({
      name: 'body',
      title: 'Supporting line',
      type: 'text',
      rows: 2,
      description:
        'Optional. One sentence removing the last objection — what happens next, how long it takes, that it costs nothing.',
      validation: (rule) =>
        rule
          .max(SECTION_LIMIT.intro)
          .warning(
            `Over ${SECTION_LIMIT.intro} characters this is an argument, not a nudge. Someone who has read this far has decided; more words give them time to change their mind.`,
          ),
    }),

    defineField({
      name: 'actions',
      title: 'Buttons',
      type: 'array',
      of: [defineArrayMember({ type: 'action' })],
      validation: (rule) => [
        rule
          .required()
          .min(1)
          .error(
            'Add at least one button. A call to action with nothing to press is a section that asks for something and provides no way to give it.',
          ),
        rule
          .max(SECTION_LIMIT.actions)
          .error(
            `Two buttons at most. Past ${SECTION_LIMIT.actions} choices at the point of asking, measurably fewer people take any of them.`,
          ),
      ],
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      body: 'body',
      actions: 'actions',
      firstAction: 'actions.0.label',
    },
    prepare({ heading, body, actions, firstAction }) {
      const label = previewText(firstAction, 30)
      return {
        title: previewText(heading) || previewText(body) || 'Call to action',
        subtitle: label
          ? `Call to action · ${label}`
          : `Call to action · ${describeCount(actions, 'button', 'buttons')}`,
        media: RocketIcon,
      }
    },
  },
})

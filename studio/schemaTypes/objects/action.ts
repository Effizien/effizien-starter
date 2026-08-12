import { ArrowRightIcon } from '@sanity/icons/ArrowRight'
import { defineField, defineType } from 'sanity'

import { describeLinkDestination, linkPreviewSelection } from '../shared/link-preview'
import { SECTION_LIMIT } from '../shared/section-limits'

/** Something the visitor can do next: a label, and where it goes.
 *
 *  ## Why this is not `navigationLink`
 *
 *  The two have the same shape today — a label and a `link`. They are kept apart
 *  because they answer to different owners and drift in different directions: a
 *  menu entry grows menu concerns (does it show on mobile, does it open a
 *  dropdown), an action grows page concerns (is it the primary one, does it
 *  carry a note about pricing). Sharing one type means every menu change is a
 *  page-builder change, and the guidance an editor reads has to be vague enough
 *  to cover both. They share the thing that genuinely is one thing — the `link`
 *  destination object — and nothing else.
 *
 *  ## Why the label is required and not derived
 *
 *  An action with no label renders as an empty button: focusable, clickable, and
 *  announced by a screen reader as "link" with nothing after it. Deriving the
 *  label from the linked page's title looks helpful and is not — it changes
 *  under the editor's feet when someone renames the page, and "Brand strategy
 *  for regulated industries" is not what belongs on a button. */
export const action = defineType({
  name: 'action',
  title: 'Action',
  type: 'object',
  icon: ArrowRightIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description:
        'The words on the button. Say what happens next — "Book a consultation", not "Click here". Someone using a screen reader can pull up a list of every link on the page with nothing but these labels to go on, so three buttons reading "Learn more" give them three identical rows.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Give this button a label. Without one it renders as an empty button — visible, clickable, and announced to a screen reader as a link with no name.',
          ),
        rule
          .max(SECTION_LIMIT.actionLabel)
          .warning(
            `Past about ${SECTION_LIMIT.actionLabel} characters this stops looking like a button and starts wrapping onto two lines. Two or three words is usually right.`,
          ),
      ],
    }),

    defineField({
      name: 'destination',
      title: 'Goes to',
      type: 'link',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Choose where this button goes. A button with no destination still looks and behaves like a button, so visitors press it and nothing happens.',
          ),
    }),
  ],
  preview: {
    select: {
      label: 'label',
      ...linkPreviewSelection('destination'),
    },
    prepare({ label, ...destination }) {
      return {
        title: label || 'Unlabelled button',
        subtitle: describeLinkDestination(destination),
        media: ArrowRightIcon,
      }
    },
  },
})

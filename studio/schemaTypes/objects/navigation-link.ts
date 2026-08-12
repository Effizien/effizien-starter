import { LinkIcon } from '@sanity/icons/Link'
import { defineField, defineType } from 'sanity'

import { LIMIT } from '../shared/editorial-guardrails'
import { describeLinkDestination, linkPreviewSelection } from '../shared/link-preview'

/** One entry in a menu: a label, and somewhere it goes.
 *
 *  The label is separate from the destination because they are separate
 *  decisions. A page called "Brand strategy for regulated industries" appears in
 *  the menu as "Brand strategy", and the menu should not force a rename of the
 *  page to get there.
 *
 *  It is deliberately *not* defaulted from the page title. An auto-filled label
 *  that silently changes when someone edits a page title is how a menu ends up
 *  reading "Untitled" in production, with nothing in the Studio to show for it. */
export const navigationLink = defineType({
  name: 'navigationLink',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      description:
        'The words shown in the menu. Name the destination — screen reader users can pull up a list of every link on a page, and four entries reading "More" give them four identical rows.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Give this entry a label, or nothing appears in the menu where it should be.',
          ),
        rule
          .max(LIMIT.navigationLabel)
          .warning(
            `Menu labels sit side by side, so past about ${LIMIT.navigationLabel} characters this one starts pushing the others off the row. One or two words is usually right.`,
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
            'Every menu entry has to go somewhere. If you wanted a heading with links underneath it instead, delete this and add a "Group of links".',
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
        title: label || 'Unlabelled entry',
        subtitle: describeLinkDestination(destination),
        media: LinkIcon,
      }
    },
  },
})

import { ThLargeIcon } from '@sanity/icons/ThLarge'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { LIMIT } from '../shared/editorial-guardrails'

/** A labelled set of links: a dropdown in the header, a column in the footer.
 *
 *  ## Why the label is not itself a link
 *
 *  A group heading that is also a link is the "Services" menu that navigates
 *  away when a touch user taps it to open the submenu, and the desktop dropdown
 *  that fires two behaviours from one control. The WAI-ARIA Authoring Practices
 *  disclosure-navigation pattern uses a *button* for the parent for exactly this
 *  reason. So a group has no destination, and an entry with a destination is a
 *  `navigationLink`. Each control does one thing (WCAG 2.2 AA — 3.2.4, 2.5.3).
 *
 *  If the client wants "Services" to be both a landing page and a dropdown, the
 *  landing page goes in the group as its first link, usually labelled "All
 *  services" — which is clearer than a heading that is secretly clickable.
 *
 *  ## Why the nesting stops here
 *
 *  `links` holds `navigationLink`, which has no `links` of its own, so a third
 *  level is not something an editor can build and then be told off for. Menus
 *  deeper than two levels cannot be operated reliably with a keyboard or on a
 *  phone. "The Studio does not offer it" is a kinder answer than a red message
 *  after twenty minutes of work.
 *
 *  ## Heading levels
 *
 *  The label becomes a real heading in the footer and the accessible name of the
 *  disclosure button in the header. The frontend picks the level from the
 *  landmark it renders into — see the note in `documents/page.ts`. No heading
 *  level is stored here, which is what makes it impossible to skip one. */
export const navigationGroup = defineType({
  name: 'navigationGroup',
  title: 'Group of links',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Heading',
      type: 'string',
      description:
        'What this group of links is called. In the footer it is shown as a heading above the column; in the main menu it is the wording on the button that opens the dropdown.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Give the group a heading. Without one the footer column has no title, and the dropdown button has nothing for a screen reader to announce.',
          ),
        rule
          .max(LIMIT.navigationLabel)
          .warning(
            `Past about ${LIMIT.navigationLabel} characters a group heading wraps onto two lines and stops working as a signpost.`,
          ),
      ],
    }),

    defineField({
      name: 'links',
      title: 'Links',
      type: 'array',
      of: [defineArrayMember({ type: 'navigationLink' })],
      description: 'Drag to reorder. This is the order visitors see and tab through.',
      validation: (rule) => [
        rule
          .required()
          .min(1)
          .error(
            'A group with no links renders as a heading with nothing under it, and as a dropdown button that opens onto an empty box. Add a link, or delete the group.',
          ),
        rule
          .max(LIMIT.groupLinks)
          .warning(
            `More than ${LIMIT.groupLinks} links in one group is more than most people read, and on a phone the dropdown starts needing its own scrollbar. Consider whether some of these belong on a page instead.`,
          ),
      ],
    }),
  ],
  preview: {
    select: { label: 'label', links: 'links' },
    prepare({ label, links }) {
      const count = Array.isArray(links) ? links.length : 0
      return {
        title: label || 'Unlabelled group',
        subtitle: count === 1 ? '1 link' : `${count} links`,
        media: ThLargeIcon,
      }
    },
  },
})

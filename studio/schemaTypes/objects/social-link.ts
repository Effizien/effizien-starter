import { ShareIcon } from '@sanity/icons/Share'
import { defineField, defineType } from 'sanity'

/** A profile on someone else's platform.
 *
 *  The platform is stored rather than sniffed out of the URL, for two reasons
 *  the frontend cannot solve on its own. It picks the icon. And it supplies the
 *  accessible name: an icon-only link with no text is announced as nothing at
 *  all, so the site renders visually-hidden text — "<Site name> on LinkedIn" —
 *  built from this field (WCAG 2.2 AA — 2.4.4, 4.1.2).
 *
 *  These are also the `sameAs` array of the Organization JSON-LD, which is how
 *  a search engine connects a site to the accounts it claims. Structured content
 *  is structured data: the same fields, not a second copy maintained by hand.
 *
 *  Adding a platform means adding an icon on the frontend, so the list is
 *  closed. "Other" is not an option, because there is no icon for it. */
export const socialLink = defineType({
  name: 'socialLink',
  title: 'Social profile',
  type: 'object',
  icon: ShareIcon,
  fields: [
    defineField({
      name: 'platform',
      title: 'Platform',
      type: 'string',
      description: 'Decides which icon is shown and what a screen reader announces.',
      options: {
        list: [
          { title: 'LinkedIn', value: 'linkedin' },
          { title: 'Instagram', value: 'instagram' },
          { title: 'Facebook', value: 'facebook' },
          { title: 'YouTube', value: 'youtube' },
          { title: 'X', value: 'x' },
          { title: 'TikTok', value: 'tiktok' },
          { title: 'Bluesky', value: 'bluesky' },
          { title: 'GitHub', value: 'github' },
        ],
        layout: 'dropdown',
      },
      validation: (rule) =>
        rule
          .required()
          .error(
            'Choose the platform. It decides the icon and the wording a screen reader reads out, and a social link with neither is invisible to everyone.',
          ),
    }),

    defineField({
      name: 'url',
      title: 'Profile address',
      type: 'url',
      description:
        'The full address of the profile, for example https://www.linkedin.com/company/acme.',
      validation: (rule) => [
        rule.required().error('Add the address of the profile, or delete this row.'),
        rule
          .uri({ scheme: ['https', 'http'], allowRelative: false })
          .error('This needs to be a full address starting with https://.'),
      ],
    }),
  ],
  preview: {
    select: { platform: 'platform', url: 'url' },
    prepare({ platform, url }) {
      return {
        title: typeof platform === 'string' ? platform : 'Social profile',
        subtitle: url || 'No address yet',
        media: ShareIcon,
      }
    },
  },
})

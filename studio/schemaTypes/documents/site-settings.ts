import { CogIcon } from '@sanity/icons/Cog'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { LIMIT } from '../shared/editorial-guardrails'

/** Things that are true of the whole site. A singleton — see `SINGLETONS` in
 *  `studio/document-types.ts`.
 *
 *  ## The test for putting something here
 *
 *  **Would changing it change every page?** If yes, it belongs here. The site
 *  name, the logo, the social profiles, the values a page falls back to when it
 *  has not set its own — each is one answer for the whole site, and asking the
 *  editor for it once instead of on every page is the difference between a CMS
 *  and a form.
 *
 *  If no, it belongs on the page. Everything a search engine reads about *one*
 *  page — its title, its description, its share image, whether to index it —
 *  lives in that page's `seo` object, because those are per-page answers with
 *  per-page consequences. This document only supplies what a page falls back to.
 *
 *  ## What is deliberately *not* here
 *
 *  - **The site's own URL.** It differs between production, a preview deploy and
 *    localhost, so it is an environment variable (`NEXT_PUBLIC_SITE_URL`), not
 *    content. Canonical URLs built from an editable field are one typo away from
 *    pointing an entire site at the wrong domain, and nothing in the Studio
 *    would show it.
 *  - **A global "hide from search engines" switch.** Genuinely useful on a
 *    staging site and genuinely catastrophic if it survives to launch or gets
 *    flipped afterwards. It belongs to the deploy, in `robots.ts`, where it is
 *    visible in a diff and covered by a review.
 *  - **Analytics ids, feature flags, redirects.** Deploy configuration — and for
 *    redirects, a document type of its own.
 *  - **The menus.** Long enough to deserve their own document; see
 *    `documents/navigation.ts`.
 *  - **Colours, fonts, spacing.** Design tokens live in `tokens/` and are built
 *    into CSS by `pnpm tokens`, which gates WCAG AA contrast. A colour picker
 *    here is a contrast failure the client can ship on a Friday afternoon.
 *
 *  ## What the frontend does with it
 *
 *  `siteName` becomes the `%s | Site name` title template and the `name` of the
 *  Organization JSON-LD; `logo`, `socialLinks` and the contact fields fill out
 *  the rest of that Organization object. Structured content is structured data —
 *  the same fields, not a second copy maintained by hand.
 *
 *  ## When the i18n module is added
 *
 *  Most of this is locale-independent: a logo, a phone number and a LinkedIn URL
 *  do not translate. `description` does. Document-level localisation gives the
 *  whole document one copy per locale, which duplicates a few unchanging fields
 *  and costs less than splitting settings into two documents to avoid it. */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: CogIcon,

  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'sharing', title: 'SEO & sharing defaults' },
    { name: 'contact', title: 'Contact' },
  ],

  fields: [
    defineField({
      name: 'siteName',
      title: 'Site name',
      type: 'string',
      group: 'identity',
      description:
        'The name of the business or the site, as a visitor should read it. It is appended to every page title ("About us — Acme Ltd"), announced as the name of the logo link, and given to search engines as the name of the organisation.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'The site name appears in every page title and on the logo link on every page. There is no sensible fallback for it.',
          ),
        rule
          .max(LIMIT.siteName)
          .warning(
            `This is appended to every page title, so every character here is a character of the page title that search results cut off. Under ${LIMIT.siteName} keeps that manageable.`,
          ),
      ],
    }),

    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'mediaImage',
      group: 'identity',
      description:
        'Shown in the header and the footer. Upload an SVG where you have one — it stays sharp at every size and weighs almost nothing.',
      /* The logo is the accessible name of the link back to the home page, so it
         is the one image on the site that is never decorative. Saying so here is
         cheaper than the client discovering it in an audit. */
      validation: (rule) =>
        rule.custom((value) => {
          const image = value as { asset?: unknown; role?: string } | undefined
          if (!image?.asset) return true
          if (image.role !== 'decorative') return true
          return 'The logo is the link back to the home page, so it is never decorative — marked this way, that link is announced as "link" and nothing else. Describe it instead, usually with just the site name.'
        }),
    }),

    defineField({
      name: 'socialLinks',
      title: 'Social profiles',
      type: 'array',
      group: 'identity',
      of: [defineArrayMember({ type: 'socialLink' })],
      description:
        'Shown as icons in the footer, and used to tell search engines which accounts belong to this organisation. Only add profiles that are actually kept up to date — a dead account linked from every page does more harm than no link.',
      validation: (rule) => [
        rule.unique(),
        rule
          .max(LIMIT.socialProfiles)
          .warning(
            'A row of more than a handful of icons stops reading as "find us here" and starts reading as clutter.',
          ),
      ],
    }),

    defineField({
      name: 'description',
      title: 'Default description',
      type: 'text',
      rows: 3,
      group: 'sharing',
      description:
        'One or two sentences describing the site. Used in search results and link previews for any page that has not written its own — so write it as a description of the business, not of the home page.',
      validation: (rule) => [
        /* Soft-required: a warning, not an error. The site works without it —
           search engines lift their own snippet off the page — it just works
           worse, in a way nobody notices for months. That is exactly the shape of
           problem to nudge about rather than block a publish over. */
        rule
          .required()
          .warning(
            'Without this, any page that has not written its own description gets whatever text a search engine chooses to lift off it. Two sentences here covers the whole site.',
          ),
        rule
          .max(LIMIT.metaDescription)
          .warning(
            `Search results cut descriptions off around ${LIMIT.metaDescription} characters. Put the part that would make someone click at the front.`,
          ),
      ],
    }),

    defineField({
      name: 'socialImage',
      title: 'Default sharing image',
      type: 'mediaImage',
      group: 'sharing',
      description:
        'Shown when someone shares a link to this site on social media or in a chat app, for any page that has not set its own. 1200 × 630 pixels. Keep any text on it large — it is often displayed the size of a postage stamp.',
    }),

    defineField({
      name: 'contactEmail',
      title: 'Email address',
      type: 'string',
      group: 'contact',
      description:
        'Shown in the footer, and given to search engines as the organisation’s contact address.',
      validation: (rule) =>
        rule
          .email()
          .error('This does not look like an email address — check for a typo.'),
    }),

    defineField({
      name: 'contactPhone',
      title: 'Phone number',
      type: 'string',
      group: 'contact',
      description:
        'Written the way you want it read out: "+44 20 7946 0000". The site turns it into a tappable link on phones.',
    }),

    defineField({
      name: 'postalAddress',
      title: 'Postal address',
      type: 'text',
      rows: 4,
      group: 'contact',
      description:
        'One line per line, as it would go on an envelope. Used in the footer and in the structured data that puts a business on a map.',
    }),
  ],

  preview: {
    select: { title: 'siteName', media: 'logo' },
    prepare({ title, media }) {
      return {
        title: 'Site settings',
        subtitle: title || 'No site name yet',
        media: media ?? CogIcon,
      }
    },
  },
})

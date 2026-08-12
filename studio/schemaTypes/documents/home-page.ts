import { HomeIcon } from '@sanity/icons/Home'
import { defineField, defineType } from 'sanity'

import { LIMIT } from '../shared/editorial-guardrails'

/** The site root. A singleton — see `SINGLETONS` in `studio/document-types.ts`,
 *  which is what pins it to the fixed id `homePage` and takes Delete, Duplicate
 *  and Unpublish off its menu. There is no `singleton: true` schema option and
 *  inventing one here would do nothing (studio-structure rules §4).
 *
 *  ## Why it is its own type rather than a page with an empty slug
 *
 *  Because an empty slug is a hole an editor falls into. A `page` whose address
 *  happens to be blank looks identical in every list to one whose address has
 *  not been filled in yet; `rule.required()` on the slug has to be relaxed to
 *  allow it; and the day someone makes a second one, the root route starts
 *  serving whichever document the query returns first. A separate type makes
 *  "there is exactly one home page and it is at /" a fact about the schema
 *  rather than a convention someone has to remember.
 *
 *  The cost is a duplicated pair of field declarations, which is real but small:
 *  the page builder and the SEO object are shared types, so what is duplicated
 *  is two lines, not two content models.
 *
 *  It carries no slug on purpose. Its route is `/`, declared once in
 *  `studio/presentation.ts` and once in the app's root route. */
export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  icon: HomeIcon,

  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO & sharing' },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      group: 'content',
      description:
        'What the home page is called in the browser tab and in search results — usually the business name and what it does, not the word "Home". Visitors rarely notice it; search engines lead with it.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'The home page needs a title. It is the first line of your entry in every search result, and the label on every bookmark of your site.',
          ),
        rule
          .max(LIMIT.pageTitle)
          .warning(
            `Search results cut titles off around ${LIMIT.pageTitle} characters, and this is the one that gets seen most.`,
          ),
      ],
    }),

    defineField({
      name: 'pageBuilder',
      title: 'Sections',
      type: 'pageBuilder',
      group: 'content',
      description:
        'The home page itself, built from sections. Drag to reorder. The first section carries the page’s main heading.',
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .error(
            'The home page has no sections, so the front page of the site would be blank. Add at least one section.',
          ),
    }),

    defineField({
      name: 'seo',
      title: 'SEO & sharing',
      type: 'seo',
      group: 'seo',
      description:
        'Optional. Anything left blank falls back to the title above and the defaults in Site settings.',
    }),
  ],

  preview: {
    select: { title: 'title' },
    prepare({ title }) {
      return {
        title: 'Home page',
        subtitle: title || 'No title yet',
        media: HomeIcon,
      }
    },
  },
})

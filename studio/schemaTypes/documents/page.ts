import { DocumentIcon } from '@sanity/icons/Document'
import { defineField, defineType } from 'sanity'

import {
  describeSlugProblem,
  isSlugUnique,
  LIMIT,
  slugifySegment,
} from '../shared/editorial-guardrails'

/** The generic page. Every archetype uses it unchanged.
 *
 *  Archetypes add *specialised* document types beside this one — `post`,
 *  `caseStudy`, `docPage` — rather than forking it or bolting a `pageType`
 *  selector onto it. A specialised type exists when the content has fields a
 *  generic page does not: an article has an author and a publication date, and
 *  those are the reason it is not a page. When it has no such fields, it is a
 *  page, and a `pageType` dropdown would be presentation smuggled in as data.
 *
 *  ## Heading levels (WCAG 2.2 AA — 1.3.1, 2.4.6)
 *
 *  No block anywhere in this schema stores its own heading level, and this is
 *  the file that records why. Levels are derived by the renderer, from position:
 *
 *    h1   the page's own title, or the first section's heading where it declares
 *         one — exactly one per page, always
 *    h2   every subsequent section heading
 *    h3+  headings *inside* a section, never starting above h3
 *
 *  Derivation is the only approach that survives an editor dragging section four
 *  above section one. An editable "heading level" field is correct at the moment
 *  it is set and wrong the first time the page is reordered, and nothing in the
 *  Studio notices. See page-builder rules §8.
 *
 *  ## Two groups, not five
 *
 *  The form is short, so more tabs would hide fields rather than organise them.
 *  But search settings genuinely are a different job from writing the page, and
 *  inline they mean every editor scrolls past them every time.
 *
 *  ## When the i18n module is added
 *
 *  Document-level localisation (`@sanity/document-internationalization`) adds a
 *  hidden `language` field and one document per locale. Nothing here changes
 *  shape and no existing content moves — which is why none of these fields are
 *  `internationalizedArrayString` today. Choosing field-level localisation later
 *  *is* a migration; choosing document-level later is a plugin install. Two
 *  things to revisit at that point, both noted where they live: slug uniqueness
 *  should be scoped by language (`shared/editorial-guardrails.ts`) and singleton
 *  ids gain a locale suffix (`studio/document-types.ts`). */
export const page = defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,

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
        'What this page is called. Used in the browser tab, in search results, in the list of pages here, and as the page heading unless the first section supplies its own.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every page needs a title. Without one it appears as "Untitled" in the browser tab, in search results, and in this list.',
          ),
        rule
          .max(LIMIT.pageTitle)
          .warning(
            `Search results cut titles off around ${LIMIT.pageTitle} characters. A longer one still works — it just ends in an ellipsis where it matters most. If the page needs the long version, set a shorter one under SEO & sharing.`,
          ),
      ],
    }),

    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: 'content',
      description:
        'The last part of this page’s address: "brand-strategy" gives example.com/brand-strategy. Changing it after launch breaks every link anyone has already shared or bookmarked, so add a redirect from the old address when you do.',
      options: {
        source: 'title',
        maxLength: LIMIT.slug,
        slugify: slugifySegment,
        /* Sanity's built-in check compares across every document type and fails
           with "Slug is already in use", naming neither the other document nor
           what to do about it. `isSlugUnique` below does the same job per type
           and says which document is in the way. */
        isUnique: () => true,
      },
      validation: (rule) => [
        rule
          .required()
          .error(
            'This page has no address, so it cannot be published or linked to. Click Generate to build one from the title.',
          ),
        rule.custom(describeSlugProblem),
        rule.custom(isSlugUnique),
      ],
    }),

    defineField({
      name: 'pageBuilder',
      title: 'Sections',
      type: 'pageBuilder',
      group: 'content',
      description:
        'The page itself, built from sections. Drag to reorder — this is the order visitors read, and the order a screen reader announces. Put the section that introduces the page first; it carries the page’s main heading.',
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .error(
            'This page has no sections, so it would publish as a blank page at a real address — and search engines would index it that way. Add at least one section, or leave the page as a draft until you have.',
          ),
    }),

    defineField({
      name: 'seo',
      title: 'SEO & sharing',
      type: 'seo',
      group: 'seo',
      description:
        'Optional. Anything left blank falls back to the page title and the defaults in Site settings, so a page is fully indexable and shareable without touching this tab.',
    }),
  ],

  /* Editors look for a page by what they touched last far more often than
     alphabetically, so recency leads here. `structure.ts` opens the list sorted
     by title, which is the right default for *finding* a page whose name you
     already know; this menu is how you get to the other one. */
  orderings: [
    {
      name: 'recentlyUpdated',
      title: 'Recently updated',
      by: [{ field: '_updatedAt', direction: 'desc' }],
    },
    {
      name: 'titleAscending',
      title: 'Title, A–Z',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],

  preview: {
    select: { title: 'title', path: 'slug.current', sections: 'pageBuilder' },
    prepare({ title, path, sections }) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled page',
        subtitle: path
          ? `/${path} · ${count === 1 ? '1 section' : `${count} sections`}`
          : 'No web address yet — cannot be published',
        media: DocumentIcon,
      }
    },
  },
})

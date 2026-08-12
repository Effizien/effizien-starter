import { FolderIcon } from '@sanity/icons/Folder'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { describeCount, previewText } from '../shared/section-preview'
import { DOCS_LIMIT } from './docs-limits'

/** One group of pages in the documentation menu — "Getting started", "Guides",
 *  "API reference".
 *
 *  ## An object, not a document
 *
 *  A group is ordering and labelling. It is meaningless outside the menu that
 *  holds it, nobody will ever open one on its own, and nothing queries it
 *  independently — the three tests in the schema rules for an object, all
 *  pointing the same way. Modelling it as a document would also cost the thing
 *  this archetype is built around: with groups as documents, moving a page from
 *  one group to another means opening two documents and retyping a reference,
 *  where here it is a drag from one list to the next on one screen.
 *
 *  ## Groups have no address of their own
 *
 *  Deliberately no `slug`. There is no `/docs/getting-started` landing page,
 *  because a group is not a thing anyone wants to read — it is a place to put
 *  pages. `/docs` renders the whole contents listing, built from these groups and
 *  the `summary` of each page underneath them, and it cannot go stale because
 *  nobody writes it.
 *
 *  This is what keeps page addresses permanent. Give a group an address and the
 *  next request is to nest the pages under it, and the moment a page's address
 *  contains the name of the group it is in, reorganising the manual starts
 *  breaking links again. The whole argument is in `doc-page.ts`.
 *
 *  ## The pages are references, and their order is the array's order
 *
 *  There is no `order` field anywhere in this archetype, and this is why: the
 *  order of the pages under a group is the order of this array, and the order of
 *  the groups is the order of the array that holds *them*. Both are drag-and-drop
 *  in the Studio. Reordering the manual is a gesture, not a spreadsheet.
 *
 *  ## Depth stops at two, by construction
 *
 *  A group holds pages, and a page holds no group — so there is no third level to
 *  create and no validation rule needed to prevent one. That is the shape every
 *  documentation sidebar worth reading has: a reader scanning a column cannot
 *  hold three levels of nesting in their head, and the third level of structure
 *  belongs *inside* a page, where the "On this page" list handles it for free.
 *
 *  A client whose manual genuinely needs three levels has two manuals. */
export const docsSection = defineType({
  name: 'docsSection',
  title: 'Group',
  type: 'object',
  icon: FolderIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Group heading',
      type: 'string',
      description:
        'The heading this group of pages sits under in the menu — "Getting started", ' +
        '"How-to guides", "Reference". Name it after what the reader is trying to do, ' +
        'not after the part of the product it covers.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Give this group a heading. Without one it renders as a gap above a list ' +
              'of pages, and someone using a screen reader hears the pages with nothing ' +
              'telling them what they have in common.',
          ),
        rule
          .max(DOCS_LIMIT.sectionTitle)
          .warning(
            `The menu is a narrow column, so past about ${DOCS_LIMIT.sectionTitle} ` +
              'characters this heading wraps onto three lines and pushes the pages under ' +
              'it off the first screen. Two or three words is usually right.',
          ),
      ],
    }),

    defineField({
      name: 'pages',
      title: 'Pages',
      type: 'array',
      description:
        'Drag to reorder, and drag between groups to move a page. This is the order ' +
        'readers see in the menu and the order "next page" follows, so put them in ' +
        'the order someone new would work through them. Nothing about a page changes ' +
        'when it moves — its address stays exactly the same.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'docPage' }],
          options: {
            /* Making a page from inside the menu produces an untitled draft that
               is already in the navigation. Pages are created in the Documentation
               list and added here afterwards. */
            disableNew: true,
            /* A page with no address cannot be linked to, so a menu entry for it
               would 404 the moment the menu is published. */
            filter: 'defined(slug.current)',
          },
        }),
      ],
      validation: (rule) => [
        rule
          .min(DOCS_LIMIT.pagesPerSectionMin)
          .error(
            'This group has no pages in it, so it publishes as a heading in the menu ' +
              'with nothing underneath. Add a page, or delete the group.',
          ),
        rule
          .unique()
          .error(
            'The same page is listed twice in this group, so it appears twice in the ' +
              'menu with both entries going to the same place. Remove one.',
          ),
        rule
          .max(DOCS_LIMIT.pagesPerSection)
          .warning(
            `Past ${DOCS_LIMIT.pagesPerSection} pages a group is a list nobody reads to ` +
              'the bottom of — readers give up and use search, which is the thing the ' +
              'menu was there to avoid. Split it into two groups with narrower headings.',
          ),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      pages: 'pages',
      firstPage: 'pages.0.title',
    },
    prepare({ title, pages, firstPage }) {
      return {
        title: previewText(title) || 'Group with no heading',
        subtitle: `${describeCount(pages, 'page', 'pages')}${
          firstPage ? ` · starts with ${previewText(firstPage, 40)}` : ''
        }`,
        media: FolderIcon,
      }
    },
  },
})

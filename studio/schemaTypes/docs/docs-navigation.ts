import { ThListIcon } from '@sanity/icons/ThList'
import type { Path, ValidationError } from 'sanity'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { describeCount } from '../shared/section-preview'
import { DOCS_LIMIT } from './docs-limits'

/** The shape of the manual. A singleton — see `SINGLETONS` in
 *  `studio/document-types.ts`, which is what pins it to the fixed id
 *  `docsNavigation` and takes Delete, Duplicate and Unpublish off its menu.
 *
 *  ## This document is the hierarchy
 *
 *  Everything about where a documentation page sits — which group it is in, what
 *  order it comes in, what "next page" means — is here, and nowhere else. A
 *  `docPage` carries no parent, no group and no rank. The full argument is in
 *  `doc-page.ts`; the short version is that hierarchy stored on the child makes
 *  reordering a numeric field and makes reorganising the manual break every URL
 *  underneath the thing that moved.
 *
 *  What that buys, concretely: the entire structure of the manual is one screen
 *  an editor can see at once, every move is a drag, and no move changes a single
 *  address.
 *
 *  ## Why a singleton and not one document per group
 *
 *  Groups as documents would scale further and edit worse. Moving a page between
 *  two groups — the most common structural edit there is — would mean opening two
 *  documents and retyping a reference, instead of dragging it. And the ordering
 *  of the groups themselves would need somewhere to live, which is a second
 *  document holding an ordered list of groups: the same shape as this one, with
 *  an extra hop.
 *
 *  **The ceiling, stated honestly.** This document holds one small reference per
 *  page, so a 200-page manual is a few tens of kilobytes — well inside anything
 *  Sanity minds. What degrades first is the editing experience: past roughly that
 *  size the drag targets get long, and two people restructuring at once will
 *  collide on one document. A manual that large has outgrown a single sidebar
 *  anyway, and the move at that point is several manuals with a chooser above
 *  them — which is this document type, once per manual, with a slug on it.
 *
 *  ## Pages not listed here still work
 *
 *  A `docPage` that is in no group has an address and renders; it is simply not
 *  in the menu. That is occasionally what an editor wants — a page linked only
 *  from an error message, a runbook nobody should stumble on — so it is not an
 *  error. It is also very often an oversight, so `docPage` carries a warning
 *  saying exactly that, on the document where the editor is standing when they
 *  create one. The two halves are deliberate: the *warning* is where the mistake
 *  is made, the *fix* is here.
 *
 *  ## What the frontend builds from this (WP5)
 *
 *    *[_type == "docsNavigation"][0]{
 *      sections[]{
 *        _key, title,
 *        pages[]->{_id, title, summary, "path": slug.current}
 *      }
 *    }
 *
 *  One query gives the sidebar, the `/docs` contents listing, the breadcrumb for
 *  every page (the address is flat, so this document is the only thing that knows
 *  which part of the manual a page belongs to), and previous/next links — which
 *  are the flattened order of this array and must never be stored on a page.
 *
 *  ## Localisation
 *
 *  A menu is per-locale content: German readers need German headings in German
 *  order, not a translated copy of an English structure. Document-level
 *  localisation gives this type one document per locale, each pinned to its own
 *  id by `singletonDocumentId` in `studio/document-types.ts` — additive, no
 *  migration. */

/** Path to a page entry, relative to the `sections` array being validated. */
const pathToPage = (sectionKey: unknown, pageKey: unknown): Path => {
  if (typeof sectionKey !== 'string' || !sectionKey) return []
  if (typeof pageKey !== 'string' || !pageKey) return [{ _key: sectionKey }]
  return [{ _key: sectionKey }, 'pages', { _key: pageKey }]
}

type NavigationPage = { _key?: unknown; _ref?: unknown }
type NavigationSection = { _key?: unknown; title?: unknown; pages?: unknown }

const sectionName = (section: NavigationSection): string =>
  typeof section.title === 'string' && section.title.trim().length > 0
    ? `"${section.title.trim()}"`
    : 'a group with no heading yet'

/** One page listed in two groups.
 *
 *  Within a single group this is caught by `unique()` on the array. Across groups
 *  nothing catches it, and the symptom is subtle enough to survive review: the
 *  page appears twice in the menu, "next page" from the one before it goes
 *  somewhere different depending on which copy the reader came through, and the
 *  breadcrumb has to pick one of the two answers.
 *
 *  There is no legitimate reason to list a page twice — an editor doing it meant
 *  to move it and copied it instead — and the fix is right here, so this blocks
 *  publishing rather than warning. */
const describeDuplicateListingProblem = (value: unknown): true | ValidationError => {
  if (!Array.isArray(value)) return true

  const seenIn = new Map<string, string>()

  for (const section of value as NavigationSection[]) {
    if (typeof section !== 'object' || section === null) continue
    const pages = Array.isArray(section.pages) ? (section.pages as NavigationPage[]) : []

    for (const page of pages) {
      if (typeof page !== 'object' || page === null) continue
      const ref = page._ref
      if (typeof ref !== 'string' || !ref) continue

      const firstGroup = seenIn.get(ref)
      if (firstGroup !== undefined) {
        return {
          message:
            `This page is already listed under ${firstGroup}, so it would appear twice ` +
            `in the menu with both entries going to the same place — and "next page" ` +
            'would lead somewhere different depending on which one the reader clicked. ' +
            'Remove it from one of the two groups. If you meant to move it, delete it ' +
            'here and drag it from the other group instead.',
          path: pathToPage(section._key, page._key),
        }
      }

      seenIn.set(ref, sectionName(section))
    }
  }

  return true
}

export const docsNavigation = defineType({
  name: 'docsNavigation',
  title: 'Documentation menu',
  type: 'document',
  icon: ThListIcon,
  fields: [
    defineField({
      name: 'sections',
      title: 'Groups',
      type: 'array',
      description:
        'The whole documentation menu, top to bottom. Drag a group to move it, and ' +
        'drag a page from one group into another to move it. Nothing about a page ' +
        'changes when you do — its web address stays the same, and every link to it ' +
        'keeps working. Reorganise as often as you like.',
      of: [defineArrayMember({ type: 'docsSection' })],
      validation: (rule) => [
        rule
          .required()
          .min(1)
          .error(
            'The documentation menu is empty, so the documentation section of the site ' +
              'has no way into it. Add a group and put at least one page in it.',
          ),
        rule.custom(describeDuplicateListingProblem),
        rule
          .max(DOCS_LIMIT.sections)
          .warning(
            `Past ${DOCS_LIMIT.sections} groups the menu is itself a thing that has to be ` +
              'navigated, which is the problem it was there to solve. Combine the ones ' +
              'with only two or three pages in them.',
          ),
      ],
    }),
  ],
  preview: {
    select: { sections: 'sections' },
    prepare({ sections }) {
      const groups = Array.isArray(sections) ? sections : []
      const pages = groups.reduce<number>((total, group: { pages?: unknown }) => {
        return total + (Array.isArray(group?.pages) ? group.pages.length : 0)
      }, 0)

      return {
        title: 'Documentation menu',
        subtitle: `${describeCount(groups, 'group', 'groups')} · ${
          pages === 1 ? '1 page' : `${pages} pages`
        }`,
        media: ThListIcon,
      }
    },
  },
})

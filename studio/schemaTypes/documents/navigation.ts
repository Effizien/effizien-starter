import { MenuIcon } from '@sanity/icons/Menu'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { LIMIT } from '../shared/editorial-guardrails'

/** Every menu on the site, in one document. A singleton — see `SINGLETONS` in
 *  `studio/document-types.ts`.
 *
 *  ## References or nested objects? (schema rules §5)
 *
 *  There are two questions here and they get opposite answers.
 *
 *  **The entries are nested objects.** A menu entry is ordering and labelling.
 *  It is meaningless outside the menu that holds it, nobody will ever open one
 *  on its own, and nothing queries it independently — §5's three tests for an
 *  object, all pointing the same way. Modelling it as a `menuItem` *document*
 *  would scatter one menu across a dozen documents, add a dozen rows to a list
 *  the client never wants to see, and buy nothing: there is no "update once,
 *  reflect everywhere" to gain, because a menu entry appears in exactly one
 *  menu. Reordering would also stop being drag-and-drop and start being a
 *  numeric `order` field, which is the worst editing experience in this whole
 *  schema.
 *
 *  **What the entries point at is a reference.** That is where a reference earns
 *  its keep: rename a page and the menu follows; try to delete a page and Sanity
 *  says the menu still needs it, *before* the delete rather than after. See
 *  `objects/link.ts`.
 *
 *  ## Why one document and not one document per menu
 *
 *  A `navigation` type with several instances needs a `key` field — "main",
 *  "footer" — matched by a string in the frontend. Strings drift. A typo
 *  produces a header that renders nothing, with no error anywhere, and the
 *  client cannot tell that apart from a deploy that failed. Named fields on one
 *  singleton cannot be typo'd, cannot be duplicated, and cannot be
 *  created-but-never-rendered.
 *
 *  The cost is that adding a third menu position is a schema change rather than
 *  a content change. That is the correct cost: a menu position nothing renders
 *  is a developer task either way.
 *
 *  ## The two entry types
 *
 *  A `navigationLink` goes somewhere. A `navigationGroup` is a heading with
 *  links under it and goes nowhere itself — a dropdown in the header, a column
 *  in the footer. Depth stops at two by construction rather than by validation:
 *  a group holds links, and a link holds no group.
 *
 *  ## Not modelled here
 *
 *  The legal row (Privacy, Terms, Imprint) is not a separate field — those are
 *  ordinary standalone entries in `footer`, and giving them a field of their own
 *  would be modelling the footer's visual rows rather than what the links are.
 *
 *  ## When the i18n module is added
 *
 *  Menus are per-locale content: German visitors need German labels and German
 *  destinations, not a translated copy of an English structure. Document-level
 *  localisation gives this type one document per locale, each pinned to its own
 *  id by `singletonDocumentId` — additive, no migration. */
export const navigation = defineType({
  name: 'navigation',
  title: 'Navigation',
  type: 'document',
  icon: MenuIcon,

  groups: [
    { name: 'header', title: 'Main menu', default: true },
    { name: 'footer', title: 'Footer' },
  ],

  fields: [
    defineField({
      name: 'header',
      title: 'Main menu',
      type: 'array',
      group: 'header',
      of: [
        defineArrayMember({ type: 'navigationLink' }),
        defineArrayMember({ type: 'navigationGroup' }),
      ],
      description:
        'The menu at the top of every page. Drag to reorder — this is the order visitors see, and the order a keyboard tabs through.',
      validation: (rule) => [
        rule
          .required()
          .min(1)
          .error(
            'The main menu is empty, so every page on the site has an empty bar across the top and no way to get anywhere. Add at least one entry.',
          ),
        rule
          .max(LIMIT.headerEntries)
          .warning(
            `Past ${LIMIT.headerEntries} top-level entries a menu stops being something people read and becomes something they skim past — and on a phone it has to collapse anyway. Group some of these instead.`,
          ),
      ],
    }),

    defineField({
      name: 'footer',
      title: 'Footer',
      type: 'array',
      group: 'footer',
      of: [
        defineArrayMember({ type: 'navigationLink' }),
        defineArrayMember({ type: 'navigationGroup' }),
      ],
      description:
        'The links at the bottom of every page. Groups become columns with a heading; standalone links sit on their own row — that is usually where Privacy and Terms go.',
      validation: (rule) =>
        rule
          .max(LIMIT.footerEntries)
          .warning(
            `More than ${LIMIT.footerEntries} columns and standalone links makes the footer taller than most of the pages it sits under.`,
          ),
    }),
  ],

  preview: {
    select: { header: 'header', footer: 'footer' },
    prepare({ header, footer }) {
      const count = (value: unknown) => (Array.isArray(value) ? value.length : 0)
      return {
        title: 'Navigation',
        subtitle: `Main menu: ${count(header)} · Footer: ${count(footer)}`,
        media: MenuIcon,
      }
    },
  },
})

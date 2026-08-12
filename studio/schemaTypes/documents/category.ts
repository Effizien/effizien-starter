import { TagIcon } from '@sanity/icons/Tag'
import { defineField, defineType } from 'sanity'

import { DOCUMENT_TYPE } from '../../document-types'
import { isValueUniqueAcrossDocuments } from '../shared/validation'

/** A subject articles are filed under. "Topic" to everyone outside this file.
 *
 *  ## Why a document rather than a list of strings on the article
 *
 *  A `topics: string[]` on `post` is one line of schema and it is wrong for the
 *  same reason free-text authors are wrong: it has no shared vocabulary. Within
 *  a year the dataset holds "Branding", "branding", "Brand strategy" and "brand",
 *  four labels for one subject, and every article filed under one of them is
 *  invisible from the other three. Nothing in the Studio warns about it, because
 *  as far as a string field is concerned nothing has gone wrong.
 *
 *  A reference gives the editor a picker instead of a text box, makes renaming a
 *  topic a single edit that propagates, and lets Sanity refuse to delete a topic
 *  that articles still point at. Schema rules §5 lists exactly this case: a
 *  shared taxonomy is a reference.
 *
 *  ## Why there are only two fields
 *
 *  The version of this type that arrives by default has a slug, a colour, an
 *  icon, a sort order and a parent topic. None of them survive the question
 *  "what breaks if this is missing?".
 *
 *  - **No slug**, because a topic has no page — `studio/presentation.ts` says so
 *    to the editor: "Topics appear on the articles filed under them, not on a
 *    page of their own." Topic archive pages on a marketing blog with thirty
 *    articles are eleven near-empty pages competing with the blog itself.
 *  - **No colour or icon**, because that is the design system's job, and a
 *    client whose brand colours are stored in their content cannot be rebranded
 *    (AGENTS.md).
 *  - **No manual sort order**, because topics are shown alphabetically or by how
 *    many articles they hold, and both are derived. An `order` field is a number
 *    an editor has to maintain by hand and will not.
 *  - **No parent topic**, because a two-level taxonomy on a blog this size is a
 *    structure nobody navigates and everybody has to maintain.
 *
 *  Adding topic archive pages later is additive, not a migration: a
 *  `slugField({pathFor: ROUTE.topic})`, a route, and an entry in
 *  `shared/linkable-types.ts`. Existing topics gain an address; none of them
 *  move.
 *
 *  ## When the i18n module is added
 *
 *  Same open question as `person`, and the same two fields' worth of surface —
 *  see the note there. */

/** A topic description is a sentence explaining what belongs under a label, not
 *  an article about the subject. Local to the archetype on purpose; see the note
 *  on `MAX_ROLE_LENGTH` in `person.ts`. */
const MAX_DESCRIPTION_LENGTH = 240

export const category = defineType({
  name: DOCUMENT_TYPE.category,
  title: 'Topic',
  type: 'document',
  icon: TagIcon,

  fields: [
    defineField({
      name: 'title',
      title: 'Topic',
      type: 'string',
      description:
        'What this subject is called, in the words a reader would use. It appears on ' +
        'every article filed under it, so it is a label rather than a sentence — ' +
        '"Brand strategy", not "Articles about brand strategy".',
      validation: (rule) => [
        rule
          .required()
          .error(
            'This topic needs a name. Without one it appears as "Untitled" in the ' +
              'picker on every article, which makes it impossible to file anything ' +
              'under it on purpose.',
          ),

        /* Blocking, and case-insensitive. "Branding" and "branding" are one
           subject to a reader and two rows to the database: articles split
           between them, and neither list ever complete again. This is the one
           mistake in this document type that cannot be seen after the fact —
           the two entries look identical in the picker.

           `lower(title)` is interpolated into the GROQ query by
           `isValueUniqueAcrossDocuments`, which is safe here and only here
           because it is a string literal written by a developer, never a value
           that came from a document or an editor. */
        rule.custom(async (value, context) => {
          if (typeof value !== 'string' || !value.trim()) return true

          const unique = await isValueUniqueAcrossDocuments(
            value.trim().toLowerCase(),
            { fieldPath: 'lower(title)', types: [DOCUMENT_TYPE.category] },
            context,
          )

          return (
            unique ||
            `A topic called "${value.trim()}" already exists. Two topics with the same ` +
              'name split the articles between them, and neither list is ever complete ' +
              'again. Use the existing one, or give this a name that says how it differs.'
          )
        }),
      ],
    }),

    defineField({
      name: 'description',
      title: 'What belongs here',
      type: 'text',
      rows: 2,
      description:
        'Optional, and mostly for whoever is filing articles a year from now. One ' +
        'sentence on what this topic covers and what it does not — it is what stops ' +
        'the same subject being split across two labels.',
      validation: (rule) =>
        rule
          .max(MAX_DESCRIPTION_LENGTH)
          .warning(
            `Past ${MAX_DESCRIPTION_LENGTH} characters this is an article about the ` +
              'subject rather than a note about the label. Write that as an article and ' +
              'file it under this topic.',
          ),
    }),
  ],

  preview: {
    select: { title: 'title', subtitle: 'description' },
    prepare({ title, subtitle }) {
      return {
        title: typeof title === 'string' && title ? title : 'Untitled topic',
        subtitle:
          typeof subtitle === 'string' && subtitle.trim()
            ? subtitle.trim()
            : 'No description — say what belongs here',
        media: TagIcon,
      }
    },
  },
})

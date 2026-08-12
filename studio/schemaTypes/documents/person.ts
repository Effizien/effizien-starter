import { UserIcon } from '@sanity/icons/User'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { DOCUMENT_TYPE } from '../../document-types'

/** A human: the author of an article, a member of the team, someone quoted.
 *
 *  ## Why a document and not a name typed on each article
 *
 *  Schema rules §5: a reference is right when the content is reused, needs its
 *  own editing screen, and should update everywhere at once. An author is all
 *  three. Typed by hand on each article you get "Jane Müller", "Jane Mueller"
 *  and "J. Müller" within a year, three bylines that no query can group, and a
 *  photo that has to be re-uploaded every time. Changing a job title becomes an
 *  edit to forty articles.
 *
 *  It also buys the thing a byline is actually for. Sanity refuses to delete a
 *  document something still references, so an editor removing someone who has
 *  written twelve articles is told, at the moment they try, rather than twelve
 *  articles losing their author quietly.
 *
 *  ## Why it has no web address
 *
 *  There is no `slug` here, and that is a decision rather than an omission —
 *  `studio/presentation.ts` states the same thing to the editor: "People appear
 *  on the articles they wrote, not on a page of their own." An author page with
 *  a photo, a bio and three articles on it is a thin page, and a site full of
 *  them is the kind of thin-content sprawl that dilutes the pages that matter.
 *
 *  If a client does want author pages later, it is additive, not a migration:
 *  add `slugField({pathFor: ROUTE.author})`, add the route to `ROUTE` and to
 *  `locations` in `presentation.ts`, and add `{name: 'person', title: 'Author',
 *  hasSlug: true}` to `shared/linkable-types.ts`. Existing people gain a slug;
 *  none of them move.
 *
 *  ## Why there is no email or phone number
 *
 *  Because it would be published. A field that exists gets filled in, and an
 *  employee's direct address on a public author byline is a spam target the
 *  client did not ask for. Contact details belong to the organisation and live
 *  in `siteSettings`.
 *
 *  ## When the i18n module is added
 *
 *  This is one of the two types where the choice is real, and worth making
 *  deliberately rather than by default. The localisation rules put structured
 *  *things* — people, categories, products — on field-level localisation, which
 *  would mean `role` and `bio` becoming `internationalizedArray…` types. That is
 *  a type change, and therefore a migration of every person already written.
 *  `name` never localises: a name is a name.
 *
 *  The cheaper alternative is to leave this type alone and let document-level
 *  localisation give each locale its own `person`, accepting that the same human
 *  exists twice. For a marketing site with four authors that is the right trade;
 *  for a site with two hundred it is not. The decision belongs in
 *  `docs/decisions/` when the module is added — the surface is exactly two
 *  fields, which is small enough that either answer stays reversible. */

/** Enough for the profiles a byline can usefully carry. The site-wide figure in
 *  `LIMIT.socialProfiles` is for a footer row and is deliberately larger; eight
 *  icons under a photograph is a link farm, not a byline. */
const MAX_PROFILE_LINKS = 4

/** A role sits on one line under a name. Past this it wraps, and a wrapped job
 *  title pushes the article text down on every byline on the site.
 *
 *  Local rather than borrowed from `LIMIT` or `SECTION_LIMIT`: the first holds
 *  numbers owned by the base content model, the second numbers owned by the
 *  block library, and a person is neither. An archetype inventing entries in
 *  either would make removing the archetype an edit to a shared file. */
const MAX_ROLE_LENGTH = 60

export const person = defineType({
  name: DOCUMENT_TYPE.person,
  /* "Person", not "Author", because the type is genuinely wider than the blog —
     a team member on an about page and a quoted expert are the same record.
     `structure.ts` labels the *list* "Authors", because inside the Blog section
     that is what they are. */
  title: 'Person',
  type: 'document',
  icon: UserIcon,

  /* No field groups. `shared/field-groups.ts` pairs Content with SEO & sharing,
     and a person has no page of their own to have SEO for — the pair would
     render an empty second tab, which reads as a form that failed to load. */

  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      description:
        'As it should appear on the byline — the form this person actually goes by, ' +
        'not their form in the payroll system.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'This person needs a name. Without one the byline on every article they ' +
              'have written is blank, and they appear as "Untitled" in this list.',
          ),
    }),

    defineField({
      name: 'role',
      title: 'Role',
      type: 'string',
      description:
        'Optional. Their job title, or how they should be described in a byline — ' +
        '"Managing Director", "Structural Engineer". It is what tells a reader why ' +
        'this person is worth listening to on this subject.',
      validation: (rule) =>
        rule
          .max(MAX_ROLE_LENGTH)
          .warning(
            `Past about ${MAX_ROLE_LENGTH} characters this stops fitting on one line ` +
              'under a name and starts wrapping across the byline. If the full title ' +
              'needs saying, say it in the biography below.',
          ),
    }),

    defineField({
      name: 'image',
      title: 'Photo',
      type: 'mediaImage',
      description:
        'Optional. A head-and-shoulders photograph, shown beside the byline. It is ' +
        'cropped to a square or a circle, so set the hotspot on the face.',
    }),

    defineField({
      name: 'bio',
      title: 'Short biography',
      type: 'simpleRichText',
      description:
        'Optional. Two or three sentences shown under the article, about why this ' +
        'person writes on this subject. No headings — this sits inside an article ' +
        'that already has its own.',
    }),

    defineField({
      name: 'socialLinks',
      title: 'Profiles elsewhere',
      type: 'array',
      of: [defineArrayMember({ type: 'socialLink' })],
      description:
        'Optional. Professional profiles for this person — not the company accounts, ' +
        'which live in Site settings. They appear as icons beside the byline, and they ' +
        'are how a search engine connects this byline to a real person with a history.',
      validation: (rule) => [
        rule
          .unique()
          .error(
            'This profile is already on the list. Two identical icons under one name ' +
              'read as a mistake, because they are one.',
          ),
        rule
          .max(MAX_PROFILE_LINKS)
          .warning(
            `Past ${MAX_PROFILE_LINKS} profiles a byline stops being a byline and ` +
              'becomes a row of icons nobody clicks. Keep the ones where this person is ' +
              'actually active.',
          ),
      ],
    }),
  ],

  preview: {
    select: { title: 'name', subtitle: 'role', media: 'image' },
    prepare({ title, subtitle, media }) {
      return {
        title: typeof title === 'string' && title ? title : 'Unnamed person',
        subtitle: typeof subtitle === 'string' && subtitle ? subtitle : 'No role given',
        media: media ?? UserIcon,
      }
    },
  },
})

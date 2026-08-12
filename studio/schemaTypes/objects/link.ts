import { LinkIcon } from '@sanity/icons/Link'
import { defineField, defineType } from 'sanity'

import { describeLinkDestination, linkPreviewSelection } from '../shared/link-preview'
import { linkableTypeFilter, linkableTypeRefs } from '../shared/linkable-types'

/** A destination. The only one in this schema.
 *
 *  Every link an editor can create — a button in a page-builder block, a menu
 *  entry, a call to action — resolves to this object. One type means one GROQ
 *  projection and one resolver function on the frontend, instead of four
 *  slightly different ones that each handle `mailto:` a bit differently.
 *
 *  ## One field, not two
 *
 *  The obvious alternative is a "Page" field and a "Web address" field side by
 *  side. It is worse three ways: the editor has to know the vocabulary before
 *  knowing which box to type in; both can be filled at once, so every consumer
 *  needs a rule for which one wins; and the empty one is permanent visual noise
 *  in the form. A radio plus conditionally-hidden fields (schema rules §4D) has
 *  one visible input at a time and no invalid state to resolve.
 *
 *  ## Internal links are references, not typed paths (schema rules §5)
 *
 *  A reference survives the page it points at being renamed, and Sanity refuses
 *  to delete a document something still references — so the editor finds out
 *  about a broken link while they are making it, rather than a customer finding
 *  out six weeks later. A typed-in path silently becomes a 404 the first time
 *  anyone edits a slug, which is the most common defect in a handed-over CMS.
 *
 *  The link *object* is nested rather than referenced, for the same section's
 *  reasons in the other direction: a link is meaningless outside the thing that
 *  holds it, nobody will ever open one on its own, and nothing queries links
 *  independently.
 *
 *  ## Why there is no `initialValue` on `linkType`
 *
 *  Defaulting it to `internal` would be friendlier by one click and wrong in a
 *  way that is hard to trace. Sanity resolves initial values through the whole
 *  document tree at creation, so every optional link field on the document would
 *  come into existence as `{linkType: 'internal'}` — non-empty for
 *  `rule.required()`, and immediately failing the "choose a page" rule below on
 *  a field the editor never intended to use. An unanswered radio is the honest
 *  representation of a link nobody has made yet.
 *
 *  ## Deliberately not modelled
 *
 *  Anchors (`/pricing#faq`) and links to uploaded files. Both are real needs and
 *  both are additive later — an optional `anchor` string, a third `linkType`
 *  value. Neither is needed by every client site, and a field that most editors
 *  must learn to ignore costs more than it saves. */
export const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'linkType',
      title: 'Where does this go?',
      type: 'string',
      options: {
        list: [
          { title: 'A page on this site', value: 'internal' },
          {
            title: 'Somewhere else — another site, an email address, a phone number',
            value: 'external',
          },
        ],
        layout: 'radio',
      },
      validation: (rule) =>
        rule
          .required()
          .error(
            'Choose whether this points at a page on this site or somewhere else, then fill in the field that appears.',
          ),
    }),

    defineField({
      name: 'internalTarget',
      title: 'Page',
      type: 'reference',
      to: linkableTypeRefs,
      description:
        'Search by page title. Picking the page rather than typing its address means the link follows the page if its address ever changes.',
      options: {
        /* Creating a blank page from inside a link field is how a dataset fills
           up with untitled orphan drafts nobody can account for. */
        disableNew: true,
        /* A page with no address of its own cannot be linked to. */
        filter: linkableTypeFilter,
      },
      hidden: ({ parent }) =>
        (parent as { linkType?: string } | undefined)?.linkType !== 'internal',
      validation: (rule) =>
        rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string } | undefined
          if (parent?.linkType !== 'internal') return true
          if (value) return true
          return 'Choose the page this points at. A link with no destination still looks clickable, so visitors click it and nothing happens.'
        }),
    }),

    defineField({
      name: 'externalUrl',
      title: 'Address',
      type: 'url',
      description:
        'A full web address (https://example.com), an email address (mailto:hello@example.com) or a phone number (tel:+441234567890).',
      hidden: ({ parent }) =>
        (parent as { linkType?: string } | undefined)?.linkType !== 'external',
      validation: (rule) => [
        rule
          .uri({ scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: false })
          .error(
            'This needs to start with https://, mailto: or tel:. A bare address like "example.com" is read as a page on this site and gives a "page not found".',
          ),
        rule.custom((value, context) => {
          const parent = context.parent as { linkType?: string } | undefined
          if (parent?.linkType !== 'external') return true
          if (value) return true
          return 'Enter the address this points at. A link with no destination still looks clickable, so visitors click it and nothing happens.'
        }),
      ],
    }),

    defineField({
      name: 'opensInNewTab',
      title: 'Open in a new tab',
      type: 'boolean',
      /* No initialValue: `false` and "not set" mean the same thing to the
         frontend, and an initial value here would write into every otherwise
         untouched link object on the document. */
      description:
        'Use sparingly. A new tab takes away the back button, and people using magnification or a screen reader often do not notice it happened. The site announces "opens in a new tab" either way, but that is a mitigation, not a reason.',
    }),
  ],
  preview: {
    select: linkPreviewSelection(),
    prepare(values) {
      return {
        title: describeLinkDestination(values),
        subtitle:
          values.linkType === 'external'
            ? 'External link'
            : values.linkType === 'internal'
              ? 'On this site'
              : 'Destination not chosen',
        media: LinkIcon,
      }
    },
  },
})

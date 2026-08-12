import { InfoOutlineIcon } from '@sanity/icons/InfoOutline'
import { WarningOutlineIcon } from '@sanity/icons/WarningOutline'
import { defineField, defineType } from 'sanity'

import { previewText } from '../shared/section-preview'

/** Something set apart from the prose because skipping it has consequences.
 *
 *  ## This is content, not styling
 *
 *  The field is `kind`, not `colour` or `style`, and it holds `note` or
 *  `warning` rather than `blue` or `yellow`. The distinction it records is a
 *  real one about the *information*: a note is worth knowing, a warning is
 *  something that costs the reader time or data if they miss it. Redesign the
 *  site and that is still true, which is the test in the schema rules.
 *
 *  Without this type, an editor who wants to set a paragraph apart makes it bold,
 *  or bold and italic, or bold with an emoji. All three convey exactly nothing to
 *  someone using a screen reader — bold is not announced — so the reader who most
 *  needs the warning is the one who does not get it. The frontend renders this as
 *  an `<aside>` with an accessible name taken from `kind`, which is what makes the
 *  emphasis structural rather than visual (WCAG 2.2 AA — 1.3.1).
 *
 *  ## Why two kinds and not five
 *
 *  Note, tip, info, important, caution, warning and danger is the usual list, and
 *  in practice editors cannot tell the middle five apart, so they pick whichever
 *  colour they like and the distinction stops meaning anything. Two can be
 *  described in one sentence each and chosen correctly every time. A third is
 *  additive — one more entry in the list below, no migration — if a client turns
 *  out to genuinely need it.
 *
 *  ## Why the body is `simpleRichText`
 *
 *  Because it has no headings in it. A heading inside a callout is a heading
 *  inside another block's content, which is exactly how a page's outline stops
 *  describing the page — and with one style defined, the Studio hides the styles
 *  dropdown entirely, so the mistake is not available rather than merely
 *  discouraged. Links and lists survive, because a warning very often ends in
 *  "see X" or lists three things to check.
 *
 *  A callout that needs a heading is a section of the page, not an aside. */
export const callout = defineType({
  name: 'callout',
  title: 'Note or warning',
  type: 'object',
  icon: InfoOutlineIcon,
  fields: [
    defineField({
      name: 'kind',
      title: 'What kind of thing is this?',
      type: 'string',
      description:
        'This is read out by screen readers and decides how strongly the box is ' +
        'marked. Use Warning sparingly — a page where everything is a warning is a ' +
        'page where nothing is.',
      options: {
        list: [
          {
            title: 'Note — useful to know, but nothing breaks without it',
            value: 'note',
          },
          {
            title: 'Warning — missing this costs time, money or data',
            value: 'warning',
          },
        ],
        layout: 'radio',
      },
      /* No `initialValue`. Sanity resolves initial values through the whole
         document tree when a document is created, so a default here would be
         written into nothing at all today — a callout only exists once inserted —
         but the habit matters: the moment this object gains an optional home on a
         document, a default would make an untouched field non-empty and quietly
         defeat `required()` elsewhere. The same reasoning is spelled out at
         length in `objects/link.ts`. */
      validation: (rule) =>
        rule
          .required()
          .error(
            'Choose whether this is a note or a warning. The two are announced ' +
              'differently to anyone using a screen reader, so an unanswered one is ' +
              'read out as an unlabelled box.',
          ),
    }),

    defineField({
      name: 'content',
      title: 'What it says',
      type: 'simpleRichText',
      description:
        'One or two sentences. Say the consequence first — "Running this deletes the ' +
        'existing dataset" — then the detail. There are no headings in here on ' +
        'purpose: an aside that needs headings is a section of the page.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'This box is empty, so it publishes as an empty coloured panel with an icon ' +
              'in it. Write what it says, or delete it.',
          ),
    }),
  ],
  preview: {
    select: {
      kind: 'kind',
      content: 'content',
    },
    prepare({ kind, content }) {
      const isWarning = kind === 'warning'
      return {
        title: previewText(content) || 'Empty note',
        subtitle: isWarning ? 'Warning' : 'Note',
        media: isWarning ? WarningOutlineIcon : InfoOutlineIcon,
      }
    },
  },
})

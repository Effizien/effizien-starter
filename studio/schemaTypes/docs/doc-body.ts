import { defineArrayMember, defineType } from 'sanity'

import { describeHeadingOutlineProblem } from '../shared/heading-outline'
import { describeAnchorProblem } from './doc-headings'

/** The body of a documentation page. Prose, with the three things prose about
 *  software needs and marketing prose must not have.
 *
 *  ## Why this is not `richText`
 *
 *  It very nearly is, and that is deliberate: the block configuration below is
 *  the one in `objects/rich-text.ts`, unchanged, so an editor who has written a
 *  text section already knows this editor. What is added is three array members
 *  and one decorator:
 *
 *    · `codeBlock`  — a sample someone is meant to copy, kept whole
 *    · `callout`    — a note or a warning, marked as such for screen readers
 *    · `code` (inline decorator) — `pnpm install`, a filename, a flag
 *
 *  None of the three belongs in `richText`. `richText` is what a marketing site's
 *  text sections are made of, and on a marketing site a code decorator is used as
 *  a highlighter and a callout is used to make a sentence yellow. `rich-text.ts`
 *  says as much: *"kept out of the default set because on a marketing or catalogue
 *  site it gets used as a highlighter"*. Its suggestion — that a docs archetype
 *  add the decorator there — covers inline code and only inline code; a
 *  documentation body also needs code as a *block*, and adding block-level code
 *  and callouts to the shared type would push both onto every client site.
 *
 *  The cost is that the `styles`, `lists` and `marks` configuration exists twice
 *  and can drift. That is real, and it is the one thing worth refactoring the
 *  moment a second archetype needs a variant: export the array member from
 *  `objects/rich-text.ts` and spread it here with an extra decorator. Until then,
 *  duplicating twenty lines in a file that is deleted whole when the archetype is
 *  not used beats coupling the base library to an archetype.
 *
 *  ## Everything about the styles is a subtraction, and the reasons are the same
 *
 *  Two heading levels, no `h1`, no underline (on the web, underlined text is a
 *  link), no strike-through, no colour. The full argument is in
 *  `objects/rich-text.ts` and is not repeated here. The one point worth restating
 *  because documentation is where it bites hardest: **"Heading" and "Subheading"
 *  are relative, not `h2` and `h3`.** A documentation page is long and deeply
 *  nested and it is exactly the kind of page an editor will want a fourth level
 *  on. There is not one. A page needing four levels of heading is two pages, and
 *  splitting it is the fix — see `shared/heading-outline.ts`.
 *
 *  ## The two validators
 *
 *  `describeHeadingOutlineProblem` is the shared rule: a Subheading with no
 *  Heading above it leaves a gap in the page structure that a screen reader
 *  announces as a missing level. It blocks publishing, as it does everywhere else.
 *
 *  `describeAnchorProblem` is this archetype's own: two headings that produce the
 *  same link, or one that produces no link at all. It warns. Both are about the
 *  same thing — the contents list down the side of the page is derived from these
 *  headings and never stored. See `doc-headings.ts`.
 *
 *  ## Deliberately not modelled
 *
 *  **Tables.** Genuinely wanted in documentation, genuinely awful to edit in
 *  Sanity without a plugin, and a real accessibility liability when hand-built
 *  (a table with no header row is a grid of unlabelled cells to a screen reader).
 *  Parameter and option tables are the honest use case, and they are better served
 *  by a document type with real fields than by a grid of free text. Left out until
 *  a client's content shows which of the two they actually have.
 *
 *  **Tabs, accordions, embedded API playgrounds.** Components, not content.
 *
 *  ## Localisation
 *
 *  Nothing here assumes one language. When field-level localisation is added,
 *  this type goes into the plugin's `fieldTypes` array alongside `richText` and
 *  `simpleRichText` — which is the reason the block library names its rich-text
 *  types instead of inlining `of: [{type: 'block'}]` at each use. */
export const docBody = defineType({
  name: 'docBody',
  title: 'Page content',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Heading', value: 'heading' },
        { title: 'Subheading', value: 'subheading' },
        { title: 'Quote', value: 'blockquote' },
      ],
      lists: [
        { title: 'Bulleted', value: 'bullet' },
        { title: 'Numbered', value: 'number' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          /* The one addition to the shared decorator set. For a command, a
             filename, a flag or a value — the things that have to be typed
             exactly and must not be smart-quoted or line-wrapped mid-token.
             `<code>` is also announced by some screen readers, which is the
             difference between "run pnpm install" and "run pnpm install". */
          { title: 'Code', value: 'code' },
        ],
        annotations: [defineArrayMember({ type: 'link', name: 'link', title: 'Link' })],
      },
    }),

    /* Screenshots go through the same image type as everything else in the
       schema, so the description requirement cannot be sidestepped by putting the
       picture inside prose. A screenshot is very rarely decorative: it usually
       contains the words the reader is being told to look for, and those words
       have to be in the description. */
    defineArrayMember({ type: 'mediaImage' }),

    defineArrayMember({ type: 'codeBlock' }),
    defineArrayMember({ type: 'callout' }),
  ],
  validation: (rule) => [
    rule.custom(describeHeadingOutlineProblem),
    rule.custom(describeAnchorProblem).warning(),
  ],
})

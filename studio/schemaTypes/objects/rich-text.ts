import { defineArrayMember, defineType } from 'sanity'

import { describeHeadingOutlineProblem } from '../shared/heading-outline'

/** Formatted text. The long form — headings, lists, quotes, images.
 *
 *  ## Everything here is a subtraction
 *
 *  Sanity's `block` type defaults to six heading levels, underline,
 *  strike-through, and code. Left at the defaults, a page builder hands a
 *  non-technical editor eleven ways to make text look different and no guidance
 *  about which means what — and the result, every time, is a site where the same
 *  kind of content is formatted three different ways depending on who typed it
 *  and when. Listing `styles`, `lists` and `marks` explicitly is the only way to
 *  turn the defaults off; omitting a key restores all of it.
 *
 *  What is gone, and why:
 *
 *  - **h1** — the page owns exactly one main heading and it is not inside a
 *    paragraph of body copy. See `shared/heading-outline.ts`.
 *  - **h4, h5, h6** — three levels of nesting inside a single section means the
 *    section is really several sections. The fix is another block, not a deeper
 *    heading, and the block library is what makes that easy.
 *  - **Underline** — on the web, underlined text is a link. Anything else
 *    underlined is a link that does not work, and people click it.
 *  - **Strike-through** — `<del>` means "this was removed from the document",
 *    which is almost never what an editor means when they reach for it. Old
 *    prices and superseded copy are content decisions, not formatting ones.
 *  - **Code** — kept out of the default set because on a marketing or catalogue
 *    site it gets used as a highlighter. A docs archetype should add
 *    `{title: 'Code', value: 'code'}` to `decorators` below; that is the whole
 *    change.
 *  - **Text colour, highlight, font size** — never present, never added. They
 *    are the design system's job, and a client site whose brand colours live in
 *    the body copy cannot be rebranded.
 *
 *  What is left is bold, italic, links, two kinds of list, a quote, two heading
 *  levels and an image: enough to write anything, not enough to invent a
 *  parallel design system inside a text field.
 *
 *  ## The heading styles are relative, not absolute
 *
 *  "Heading" and "Subheading" store `heading` and `subheading`, not `h2` and
 *  `h3`. They mean one and two levels below the section that contains them, and
 *  what that resolves to depends on where the section sits on the page. Full
 *  reasoning in `shared/heading-outline.ts`.
 *
 *  ## Links are the shared `link` object
 *
 *  Not a bare `url` string. An editor linking to a page on this site picks the
 *  page, so the link survives that page being renamed — the single most common
 *  defect in a handed-over CMS is a body-copy link typed by hand in 2024 that
 *  404s in 2026. */
export const richText = defineType({
  name: 'richText',
  title: 'Text',
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
        ],
        annotations: [defineArrayMember({ type: 'link', name: 'link', title: 'Link' })],
      },
    }),

    /* Images inside prose go through the same type as images anywhere else, so
       the description requirement cannot be bypassed by putting the picture in a
       paragraph instead of a section. */
    defineArrayMember({ type: 'mediaImage' }),
  ],
  validation: (rule) => rule.custom(describeHeadingOutlineProblem),
})

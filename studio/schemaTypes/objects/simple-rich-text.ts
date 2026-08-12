import { defineArrayMember, defineType } from 'sanity'

/** Formatted text with no headings in it. The short form.
 *
 *  Used where the text is already *inside* something that has a heading — the
 *  answer to a question, the body of a call to action. A heading in there would
 *  be a heading inside a heading's content, which is how an outline stops
 *  describing the page.
 *
 *  This is a structural guarantee, not advice. There is no styles dropdown in
 *  this editor at all: with one style defined, the Studio hides the control, so
 *  the mistake is not available rather than merely discouraged.
 *
 *  Lists survive the cut because an answer to a question is very often a list of
 *  three things, and an editor denied a list will build one out of line breaks
 *  and hyphens, which reads as one long sentence to a screen reader.
 *
 *  When field-level localisation is added later, both this and `richText` go in
 *  the plugin's `fieldTypes` array. Nothing here has to change for that — which
 *  is the reason the block library uses named rich-text types everywhere instead
 *  of inlining `of: [{type: 'block'}]` at each use. */
export const simpleRichText = defineType({
  name: 'simpleRichText',
  title: 'Text',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [{ title: 'Normal', value: 'normal' }],
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
  ],
})

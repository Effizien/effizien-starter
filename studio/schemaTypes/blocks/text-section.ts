import { BlockContentIcon } from '@sanity/icons/BlockContent'
import { defineField, defineType } from 'sanity'

import { sectionHeadingField } from '../shared/section-fields'
import { previewText } from '../shared/section-preview'

/** Words on a page. The one block that has no shape of its own.
 *
 *  This is the workhorse, and the reason the library needs six blocks rather
 *  than twenty: anything that is prose — an explanation, a policy, a step-by-step,
 *  a paragraph with a screenshot in the middle of it — is this block, not a new
 *  one. A block earns its place in `pageBuilder` by having *structure* a text
 *  section cannot express (a set of items laid out as a set, a question paired
 *  with its answer, an attributed quote). "It looks different" is not structure.
 *
 *  It is also why there is no standalone image block. An image with a caption is
 *  a text section containing an image: same description requirement, same
 *  caption, and the editor can put words around it without asking for another
 *  block first.
 *
 *  ## No introduction field
 *
 *  Every other section has `heading` + `intro` + its contents, because the
 *  contents are structured and the intro sets them up. Here the contents *are*
 *  prose, so an introduction field would be a paragraph in a different box for
 *  no reason, and editors would have to guess which one to type in. */
export const textSection = defineType({
  name: 'textSection',
  title: 'Text',
  type: 'object',
  icon: BlockContentIcon,
  fields: [
    sectionHeadingField,

    defineField({
      name: 'content',
      title: 'Text',
      type: 'richText',
      validation: (rule) =>
        rule
          .required()
          .error(
            'This section has no text in it, so it renders as a blank gap on the page. Write something, or delete the section.',
          ),
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
      content: 'content',
    },
    prepare({ heading, content }) {
      return {
        title: previewText(heading) || previewText(content) || 'Text — empty',
        subtitle: 'Text',
        media: BlockContentIcon,
      }
    },
  },
})

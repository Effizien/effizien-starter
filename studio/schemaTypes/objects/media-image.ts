import { ImageIcon } from '@sanity/icons/Image'
import { defineField, defineType } from 'sanity'

import { hasText, LIMIT } from '../shared/editorial-guardrails'

/** The only image type in this schema. The built-in `image` type is never used
 *  directly anywhere, and that is the entire point of this file.
 *
 *  ## Why alternative text cannot be optional
 *
 *  WCAG 2.2 AA (1.1.1 Non-text Content) allows an image exactly two correct
 *  outcomes: it carries a text alternative, or it is marked decorative and
 *  rendered with `alt=""`. A *missing* `alt` attribute is neither — a screen
 *  reader falls back to the filename, and the visitor hears "I M G underscore
 *  four eight two one dot J P G". An image field that lets alt be forgotten is a
 *  defect in the field, not a mistake by the editor, and documentation does not
 *  fix it. Routing every image through this one type is what makes the
 *  requirement structural instead of aspirational.
 *
 *  ## Why `role` is a list and not an `isDecorative` boolean
 *
 *  Image roles genuinely do expand — functional (an image that *is* the button),
 *  complex (a chart needing a long description elsewhere on the page), text-in-
 *  image (the words have to be repeated verbatim). Each is a different
 *  obligation with a different field. A `role` string absorbs the next case as
 *  one more option; `isDecorative: boolean` absorbs it as a migration. Schema
 *  rules §4C: prefer a list over a boolean for a binary that might not stay
 *  binary.
 *
 *  ## Why there is no `initialValue`
 *
 *  Sanity resolves initial values through the whole document tree when a
 *  document is created. An `initialValue` here would write `{role:
 *  'informative'}` into every image field on the document, including the ones
 *  nobody filled in — which makes an empty image field non-empty and quietly
 *  defeats `rule.required()` wherever an image is mandatory. So the radio starts
 *  unanswered and the validation below fails *closed*: no answer is treated as
 *  informative, and an informative image needs a description.
 *
 *  ## Why alt text lives here and not on the asset
 *
 *  On the usage, not on the asset. The same photograph means "our Berlin studio"
 *  on the about page and "where you would be working" in a careers section. The
 *  asset library's own `altText` cannot know which, so this overrides it.
 *
 *  ## What the frontend still owes
 *
 *  An explicit width on every rendered image (AGENTS.md performance budget) —
 *  the original asset can be several megabytes. `metadata: ['lqip']` below gives
 *  the renderer a blur placeholder without adding a dependency. */
export const mediaImage = defineType({
  name: 'mediaImage',
  title: 'Image',
  type: 'image',
  icon: ImageIcon,
  options: {
    /* Lets the editor say what must stay in frame when the image is cropped to a
       different shape on a phone. Without it, a crop takes the middle and
       decapitates people. */
    hotspot: true,
    /* A base64 thumbnail stored on the asset, used as the blur-up placeholder.
       Costs nothing at request time and removes a layout flash on slow
       connections. */
    metadata: ['lqip'],
  },
  fields: [
    defineField({
      name: 'role',
      title: 'What is this image doing here?',
      type: 'string',
      description:
        'This decides what someone using a screen reader hears. If you are not sure, choose the first one — describing an image that did not need it is a much smaller problem than the reverse.',
      options: {
        list: [
          { title: 'It means something — it needs a description', value: 'informative' },
          {
            title: 'It is decoration — there is nothing to say about it',
            value: 'decorative',
          },
        ],
        layout: 'radio',
      },
    }),

    defineField({
      name: 'alt',
      title: 'Description',
      type: 'string',
      description:
        'What someone who cannot see this image needs to know — the content and its point, not the file. "Two colleagues reviewing printed brand guidelines", not "IMG_4821". If the image contains words, include them.',
      hidden: ({ parent }) =>
        (parent as { role?: string } | undefined)?.role === 'decorative',
      validation: (rule) => [
        rule.custom((alt, context) => {
          const parent = context.parent as { asset?: unknown; role?: string } | undefined
          /* Nothing uploaded: there is no image to describe, and nagging about an
             empty slot trains editors to ignore red messages everywhere else. */
          if (!parent?.asset) return true
          if (parent.role === 'decorative') return true
          if (hasText(alt)) return true
          return 'Describe this image. Anyone using a screen reader gets this text instead of the picture, and so does anyone whose connection failed to load it. If it is purely decoration, say so above and this field goes away.'
        }),

        rule
          .max(LIMIT.altText)
          .warning(
            `Screen readers do not pause inside a description, so past about ${LIMIT.altText} characters this becomes one unbroken sentence. If the image needs more explanation than that, put it in the caption or the page text where everyone can read it.`,
          ),

        rule
          .custom((alt) => {
            if (typeof alt !== 'string') return true
            if (
              !/^\s*(an?\s+)?(image|photo|photograph|picture|graphic|illustration)\s+(of|showing)\b/i.test(
                alt,
              )
            ) {
              return true
            }
            return 'A screen reader already announces this as an image, so "Photo of…" gets read out twice. Start with the subject instead.'
          })
          .warning(),
      ],
    }),

    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
      description:
        'Optional, and shown on the page to everyone. A caption adds something the picture does not say ("Our Berlin studio, 2025"); the description above replaces the picture for people who cannot see it. Different jobs — do not paste the same text into both.',
      /* A decorative image with a caption is not decorative. */
      hidden: ({ parent }) =>
        (parent as { role?: string } | undefined)?.role === 'decorative',
      validation: (rule) =>
        rule
          .max(LIMIT.caption)
          .warning(
            `Past ${LIMIT.caption} characters this is a paragraph, not a caption, and it reads as an afterthought stuck under a picture. Move it into the page text.`,
          ),
    }),
  ],
  preview: {
    select: {
      media: 'asset',
      filename: 'asset.originalFilename',
      alt: 'alt',
      role: 'role',
      caption: 'caption',
    },
    prepare({ media, filename, alt, role, caption }) {
      const described = role === 'decorative' || hasText(alt)
      return {
        title: caption || alt || filename || 'Image',
        subtitle:
          role === 'decorative'
            ? 'Decorative — hidden from screen readers'
            : described
              ? 'Described'
              : 'Needs a description',
        media: media ?? ImageIcon,
      }
    },
  },
})

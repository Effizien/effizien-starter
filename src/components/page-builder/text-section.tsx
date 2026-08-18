import { SectionHeading } from '@/components/page-builder/section-heading'
import { PortableTextRenderer, type RichTextValue } from '@/components/portable-text'
import type { SectionHeadingLevels } from '@/lib/page-builder/heading-outline'

/** Words on a page. The block with no shape of its own.
 *
 *  Everything interesting happens in `PortableTextRenderer`; what this file
 *  contributes is the one thing the renderer cannot know — **which level the
 *  headings inside the prose sit at**.
 *
 *  `levels.child` is that answer, and it is not a constant. A text section with
 *  a heading of its own renders that heading at `h2` and its inner "Heading"
 *  style at `h3`. A text section with *no* heading has nothing for its contents
 *  to be a child of, so the same inner style renders at `h2` and takes the
 *  section's place. That is rule 3 in `heading-outline.ts`, and it is the reason
 *  the schema calls the styles "Heading" and "Subheading" rather than `h2` and
 *  `h3` — the block genuinely cannot know, so it asks.
 */

export type TextSectionValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
  readonly content?: readonly RichTextValue[] | null
}

type TextSectionProps = {
  readonly value: TextSectionValue
  readonly levels: SectionHeadingLevels
}

export function TextSection({ value, levels }: TextSectionProps) {
  return (
    <section className="flex max-w-2xl flex-col gap-4">
      <SectionHeading
        level={levels.section}
        className="text-balance font-semibold text-3xl tracking-tight"
      >
        {value.heading}
      </SectionHeading>

      <PortableTextRenderer
        value={value.content}
        childLevel={levels.child}
        className="flex flex-col gap-4"
      />
    </section>
  )
}

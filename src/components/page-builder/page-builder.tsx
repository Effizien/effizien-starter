import { Fragment, type ReactNode } from 'react'

import { Hero, type HeroValue } from '@/components/page-builder/hero'
import {
  TextSection,
  type TextSectionValue,
} from '@/components/page-builder/text-section'
import {
  headingOutline,
  type SectionHeadingLevels,
} from '@/lib/page-builder/heading-outline'

/** A page, rendered from the sections an editor composed.
 *
 *  ## This file must not import an archetype's blocks
 *
 *  `articleList` (marketing), `productList` and `enquiryForm` (catalogue) are
 *  contributed by the active archetype, and the Studio's `blocks/page-builder.ts`
 *  refers to them **by name** for a reason worth repeating here: importing an
 *  archetype module from the base page builder is a cycle, and it is what made
 *  the archetype switch fail with `Unknown type: post` in WP4 — a one-line
 *  change that did not actually work.
 *
 *  The same rule applies on this side of the boundary. `BLOCKS` below holds the
 *  base library only. An archetype contributes to it from its own module, which
 *  imports this one; nothing here reaches the other way. A section whose type is
 *  not registered renders nothing rather than throwing, so a page composed on a
 *  site whose archetype was switched degrades to the blocks that still exist
 *  instead of a 500.
 *
 *  ## The one-`h1` rule lives here, not on each route
 *
 *  `headingOutline` decides whether the page's `h1` comes from the first section
 *  or from the document title — **never both, never neither**. Every route that
 *  renders a page builder needs that decision, and a route re-implementing it is
 *  a route that can get it wrong on its own. So the title is passed in and this
 *  component renders it, or does not.
 *
 *  ## Every section is passed to the outline, including unrendered ones
 *
 *  The levels are computed from the full ordered list before anything renders,
 *  which is why `PAGE_BUILDER_PROJECTION` returns `heading` for block types that
 *  have no renderer yet. Filtering to renderable blocks first would move the
 *  `h1` onto the wrong section.
 */

/** The minimum a section has to look like to be dispatched and levelled. */
export type SectionValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
}

type SectionRenderer = (section: SectionValue, levels: SectionHeadingLevels) => ReactNode

/** The base block library. Six types; two of them render today.
 *
 *  `features`, `faqs`, `testimonials` and `callToAction` arrive in WP12 chunk 3.
 *  Until then they are queried, counted by the outline, and skipped below — the
 *  page is incomplete rather than broken, which is the right failure for a
 *  half-built renderer. */
const BLOCKS: Record<string, SectionRenderer> = {
  /* The cast is confined to this table. Each component then declares exactly
     the shape it needs, rather than every block accepting an unknown. */
  hero: (section, levels) => <Hero value={section as HeroValue} levels={levels} />,
  textSection: (section, levels) => (
    <TextSection value={section as TextSectionValue} levels={levels} />
  ),
}

/** What a section falls back to if the outline somehow has no entry for its
 *  key. Unreachable in practice — the outline is built from the same array —
 *  but the alternative is a crash on a page an editor is looking at. `h2` with
 *  no promotion is the conservative shape. */
const FALLBACK_LEVELS: SectionHeadingLevels = { section: 2, child: 3 }

type PageBuilderProps = {
  readonly sections: readonly SectionValue[] | null | undefined
  /** The document's own title, rendered as the `h1` only when no section
   *  claimed it. */
  readonly documentTitle?: string | null
}

export function PageBuilder({ sections, documentTitle }: PageBuilderProps) {
  const outline = headingOutline(sections)

  return (
    <>
      {outline.documentTitleIsPageHeading && documentTitle ? (
        <h1 className="max-w-2xl text-balance font-semibold text-4xl tracking-tight">
          {documentTitle}
        </h1>
      ) : null}

      {(sections ?? []).map((section) => {
        const render = BLOCKS[section._type]
        if (!render) return null

        return (
          <Fragment key={section._key}>
            {render(section, outline.levels[section._key] ?? FALLBACK_LEVELS)}
          </Fragment>
        )
      })}
    </>
  )
}

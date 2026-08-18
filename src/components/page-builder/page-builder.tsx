import { Fragment, type ReactNode } from 'react'

import { JsonLd } from '@/components/json-ld'
import {
  CallToAction,
  type CallToActionValue,
} from '@/components/page-builder/call-to-action'
import { Faqs, type FaqsValue } from '@/components/page-builder/faqs'
import { Features, type FeaturesValue } from '@/components/page-builder/features'
import { Hero, type HeroValue } from '@/components/page-builder/hero'
import {
  Testimonials,
  type TestimonialsValue,
} from '@/components/page-builder/testimonials'
import {
  TextSection,
  type TextSectionValue,
} from '@/components/page-builder/text-section'
import {
  headingOutline,
  type SectionHeadingLevels,
} from '@/lib/page-builder/heading-outline'
import { buildFaqPage } from '@/lib/seo/json-ld/build'

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

/** The base block library, complete: all six types render.
 *
 *  `articleList` (marketing) and the catalogue blocks are contributed by the
 *  active archetype in WP12 chunk 5, from their own module — never imported
 *  here, for the reason in this file's header. */
const BLOCKS: Record<string, SectionRenderer> = {
  /* The cast is confined to this table. Each component then declares exactly
     the shape it needs, rather than every block accepting an unknown. */
  hero: (section, levels) => <Hero value={section as HeroValue} levels={levels} />,
  textSection: (section, levels) => (
    <TextSection value={section as TextSectionValue} levels={levels} />
  ),
  features: (section, levels) => (
    <Features value={section as FeaturesValue} levels={levels} />
  ),
  faqs: (section, levels) => <Faqs value={section as FaqsValue} levels={levels} />,
  testimonials: (section, levels) => (
    <Testimonials value={section as TestimonialsValue} levels={levels} />
  ),
  callToAction: (section, levels) => (
    <CallToAction value={section as CallToActionValue} levels={levels} />
  ),
}

/** Every FAQ entry on the page, in reading order, as one list.
 *
 *  ## One `FAQPage`, not one per block
 *
 *  `FAQPage` describes *the page*, so a page carrying two FAQ sections still
 *  states a single object with every question in it. Emitting the markup from
 *  inside the block component would be a tighter coupling to "is this visible",
 *  but it would also emit two `FAQPage` entities for one URL, which is
 *  malformed. Deriving it here from the same array that renders keeps the
 *  coupling: if the block is not in `sections`, the questions are not in the
 *  markup either.
 *
 *  `buildFaqPage` returns null when nothing survives — an FAQ block an editor
 *  left empty contributes no markup rather than an empty object. */
const faqItemsOnPage = (sections: readonly SectionValue[]) =>
  sections
    .filter((section): section is FaqsValue => section._type === 'faqs')
    .flatMap((section) => section.items ?? [])

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
  const rendered = sections ?? []

  return (
    <>
      {/* Wired here and nowhere earlier. `buildFaqPage` has existed since WP5
          and was deliberately left unwired, because structured data describing
          questions a visitor cannot see on the page is a manual action rather
          than a missed opportunity. The block renders as of this chunk, so the
          markup is now true. */}
      <JsonLd data={buildFaqPage(faqItemsOnPage(rendered))} />

      {outline.documentTitleIsPageHeading && documentTitle ? (
        <h1 className="max-w-2xl text-balance font-semibold text-4xl tracking-tight">
          {documentTitle}
        </h1>
      ) : null}

      {rendered.map((section) => {
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

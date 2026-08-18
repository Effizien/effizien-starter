import { Link } from '@/components/link'
import { SectionHeading } from '@/components/page-builder/section-heading'
import { SanityImage, type SanityImageValue } from '@/components/sanity-image'
import { Button } from '@/components/ui/button'
import { sectionAlignmentClass } from '@/lib/page-builder/alignment'
import type { SectionHeadingLevels } from '@/lib/page-builder/heading-outline'
import { type LinkValue, resolveHref } from '@/lib/page-builder/resolve-href'

/** The section that opens a page and says what it is for.
 *
 *  Structural default, not a design. It is a heading, a paragraph, an optional
 *  image and up to two buttons, stacked and aligned — no full-bleed background,
 *  no overlay, no split layout. A client site restyles this, and WP3's rebrand
 *  runbook is what makes that cheap.
 *
 *  ## The heading level is not `h1` here
 *
 *  It usually resolves to one, because a hero is normally the first section and
 *  the schema requires it to have a heading. But "usually" is the whole reason
 *  the level is passed in: a hero previewed on its own in Presentation, or one
 *  an editor dragged below another section, is not the page heading, and a
 *  hardcoded `<h1>` would give that page two.
 *
 *  ## Alignment
 *
 *  The one presentational field in the block library, and the first consumer of
 *  `src/lib/page-builder/alignment.ts` — which until now had a field writing to
 *  it and nothing reading it. The stored values are `start`/`center` rather than
 *  `left`/`center` so a right-to-left locale stays a CSS concern.
 */

type ActionValue = {
  readonly _key: string
  readonly label?: string | null
  readonly destination?: LinkValue | null
}

export type HeroValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
  readonly lede?: string | null
  readonly alignment?: string | null
  readonly image?: SanityImageValue | null
  readonly actions?: readonly ActionValue[] | null
}

type HeroProps = {
  readonly value: HeroValue
  readonly levels: SectionHeadingLevels
}

export function Hero({ value, levels }: HeroProps) {
  /* An action whose destination does not resolve is dropped rather than
     rendered. `Link` degrades to a span, and a span wrapped in a button is
     exactly what `action.ts` warns about: something that looks and behaves like
     a button, which visitors press and nothing happens. */
  const actions = (value.actions ?? []).filter(
    (action) => action.label && resolveHref(action.destination),
  )

  return (
    <section className={`flex flex-col gap-6 ${sectionAlignmentClass(value.alignment)}`}>
      <div className="flex max-w-2xl flex-col gap-4">
        <SectionHeading
          level={levels.section}
          className="text-balance font-semibold text-4xl tracking-tight"
        >
          {value.heading}
        </SectionHeading>

        {value.lede ? (
          <p className="text-pretty text-lg text-muted-foreground">{value.lede}</p>
        ) : null}
      </div>

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {actions.map((action, index) => (
            <Button
              key={action._key}
              asChild
              size="lg"
              /* The first is the one you actually want — `hero.ts` says so to
                 the editor, so the page has to mean it. */
              variant={index === 0 ? 'default' : 'outline'}
            >
              <Link value={action.destination}>{action.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}

      {value.image ? (
        <SanityImage
          value={value.image}
          /* Usually the largest image on the page and the one that decides
             perceived load time, so it is the one image that gets `priority`
             — it is above the fold by definition. */
          width={1200}
          sizes="(min-width: 768px) 768px, 100vw"
          priority
          className="w-full"
        />
      ) : null}
    </section>
  )
}

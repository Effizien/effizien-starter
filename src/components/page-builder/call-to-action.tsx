import { Link } from '@/components/link'
import { SectionHeading } from '@/components/page-builder/section-heading'
import { Button } from '@/components/ui/button'
import type { SectionHeadingLevels } from '@/lib/page-builder/heading-outline'
import { type LinkValue, resolveHref } from '@/lib/page-builder/resolve-href'

/** The ask.
 *
 *  Structurally almost the hero, and deliberately not shared with it. They
 *  diverge on everything that matters: a hero opens a page and may carry an
 *  image and an alignment, this closes one and carries neither, and its heading
 *  is a sentence rather than a title. Factoring them together would produce one
 *  component with two modes and a prop that means "am I the other one".
 *
 *  Buttons follow the same rule as everywhere else: an action whose destination
 *  does not resolve is dropped, because `call-to-action.ts` requires at least
 *  one button and a section that asks for something while providing no way to
 *  give it is worse than no section.
 */

type ActionValue = {
  readonly _key: string
  readonly label?: string | null
  readonly destination?: LinkValue | null
}

export type CallToActionValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
  readonly body?: string | null
  readonly actions?: readonly ActionValue[] | null
}

type CallToActionProps = {
  readonly value: CallToActionValue
  readonly levels: SectionHeadingLevels
}

export function CallToAction({ value, levels }: CallToActionProps) {
  const actions = (value.actions ?? []).filter(
    (action) => action.label && resolveHref(action.destination),
  )

  return (
    <section className="flex flex-col items-start gap-6 rounded-xl border border-border bg-muted/40 p-8">
      <div className="flex max-w-2xl flex-col gap-3">
        <SectionHeading
          level={levels.section}
          className="text-balance font-semibold text-2xl tracking-tight"
        >
          {value.heading}
        </SectionHeading>

        {value.body ? (
          <p className="text-pretty text-muted-foreground">{value.body}</p>
        ) : null}
      </div>

      {actions.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {actions.map((action, index) => (
            <Button
              key={action._key}
              asChild
              size="lg"
              variant={index === 0 ? 'default' : 'outline'}
            >
              <Link value={action.destination}>{action.label}</Link>
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

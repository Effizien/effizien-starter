import { SectionHeading } from '@/components/page-builder/section-heading'
import { SanityImage, type SanityImageValue } from '@/components/sanity-image'
import type { SectionHeadingLevels } from '@/lib/page-builder/heading-outline'

/** Quotes, attributed.
 *
 *  ## `blockquote` + `figcaption`, not a paragraph in italics
 *
 *  The attribution has to be *associated* with the quote in the markup, not
 *  merely next to it. `<figure><blockquote>…</blockquote><figcaption>` is the
 *  pairing that does that: a screen reader announces who said it as part of the
 *  quote rather than as an unrelated line of text that happens to follow.
 *
 *  ## No headings in here, deliberately
 *
 *  A person's name is not a section of the page, so it is not a heading — which
 *  is why this block ignores `levels.child` while `features` depends on it. The
 *  section's own heading still comes from the outline like every other block's.
 *
 *  ## The quotation marks are the page's job
 *
 *  `testimonial.ts` tells the editor to leave them off, so something has to add
 *  them. CSS `quotes` would put them in a pseudo-element, where they are
 *  decoration a screen reader never announces — correct, since `blockquote`
 *  already carries that meaning semantically.
 */

type TestimonialValue = {
  readonly _key: string
  readonly quote?: string | null
  readonly name?: string | null
  readonly context?: string | null
  readonly portrait?: SanityImageValue | null
}

export type TestimonialsValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
  readonly intro?: string | null
  readonly items?: readonly TestimonialValue[] | null
}

type TestimonialsProps = {
  readonly value: TestimonialsValue
  readonly levels: SectionHeadingLevels
}

export function Testimonials({ value, levels }: TestimonialsProps) {
  const items = (value.items ?? []).filter((item) => item.quote)
  if (items.length === 0) return null

  return (
    <section className="flex flex-col gap-8">
      {value.heading || value.intro ? (
        <div className="flex max-w-2xl flex-col gap-3">
          <SectionHeading
            level={levels.section}
            className="text-balance font-semibold text-3xl tracking-tight"
          >
            {value.heading}
          </SectionHeading>

          {value.intro ? (
            <p className="text-pretty text-muted-foreground">{value.intro}</p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-8 sm:grid-cols-2">
        {items.map((item) => (
          <figure key={item._key} className="flex flex-col gap-4">
            <blockquote className="text-pretty text-lg leading-relaxed before:content-['“'] after:content-['”']">
              {item.quote}
            </blockquote>

            {item.name ? (
              <figcaption className="flex items-center gap-3">
                {item.portrait ? (
                  <SanityImage
                    value={item.portrait}
                    width={80}
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                ) : null}

                <span className="text-sm">
                  <span className="font-medium">{item.name}</span>
                  {item.context ? (
                    <span className="block text-muted-foreground">{item.context}</span>
                  ) : null}
                </span>
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  )
}

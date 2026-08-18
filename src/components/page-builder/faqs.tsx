import { ChevronDownIcon } from 'lucide-react'

import { SectionHeading } from '@/components/page-builder/section-heading'
import { PortableTextRenderer, type RichTextValue } from '@/components/portable-text'
import { headingTag, type SectionHeadingLevels } from '@/lib/page-builder/heading-outline'

/** Questions paired with their answers.
 *
 *  ## Why this is `<details>` and not the shadcn Accordion
 *
 *  WP12 chunk 3 was planned around the Accordion. It was built, measured, and
 *  removed, because on this block specifically it cannot satisfy two
 *  requirements at once. Recorded here so the next person does not redo the
 *  experiment:
 *
 *  - **Without `forceMount`**, Radix unmounts a closed panel's children on
 *    hydration. The SSR HTML contains the answers, so `curl` looks fine — but
 *    the hydrated DOM has three empty panels, and Google renders JavaScript.
 *    The `FAQPage` markup this page emits would then describe answers the
 *    rendered document does not contain, which is the visible-content mismatch
 *    `buildFaqPage` was left unwired to avoid.
 *  - **With `forceMount`**, the answers stay in the DOM and render *visible* —
 *    Radix leaves `hidden` off, and shadcn's content styles only animate rather
 *    than hold a collapsed state. Collapsing it in CSS instead would keep every
 *    answer in the accessibility tree and every link in the tab order while
 *    invisible, which is a worse defect than the one being fixed.
 *
 *  `<details>` has neither problem. Content stays in the document for crawlers
 *  and for the structured data; a closed panel is out of the accessibility tree
 *  and out of the tab order because the browser does that natively; keyboard
 *  support is built in; and it ships no JavaScript, on a block that appears on
 *  marketing pages where weight is the budget.
 *
 *  The Accordion is still the right component for a disclosure whose content is
 *  *not* mirrored in structured data. It is one CLI command away when a block
 *  needs it.
 *
 *  ## The question is a heading as well as a control
 *
 *  A heading inside `<summary>` is explicitly allowed by the HTML content model,
 *  and it is what lets someone navigating by heading reach an individual
 *  question rather than only the section. The level comes from the outline, like
 *  every other heading on the page.
 */

type FaqItemValue = {
  readonly _key: string
  readonly question?: string | null
  readonly answer?: readonly RichTextValue[] | null
}

export type FaqsValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
  readonly intro?: string | null
  readonly items?: readonly FaqItemValue[] | null
}

type FaqsProps = {
  readonly value: FaqsValue
  readonly levels: SectionHeadingLevels
}

export function Faqs({ value, levels }: FaqsProps) {
  const items = (value.items ?? []).filter((item) => item.question)
  if (items.length === 0) return null

  /* `levels.child` is never 1 — `headingOutline` only ever gives an `h1` to a
     section's own heading, never to what sits inside one — but the type is the
     full range and cannot say so. A question that became the page's `h1` would
     be wrong even if the outline somehow asked for it. */
  const questionTag = headingTag(levels.child)
  const QuestionHeading = questionTag === 'h1' ? 'h2' : questionTag

  return (
    <section className="flex flex-col gap-6">
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

      <div className="flex max-w-2xl flex-col">
        {items.map((item) => (
          <details key={item._key} className="group border-border border-b">
            {/* `list-none` plus the WebKit marker rule removes the native
                triangle in every engine; the chevron below replaces it and is
                decorative, so it is hidden from assistive technology — the
                summary already announces its own expanded state. */}
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
              <QuestionHeading className="text-pretty font-medium">
                {item.question}
              </QuestionHeading>
              <ChevronDownIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              />
            </summary>

            <PortableTextRenderer
              value={item.answer}
              /* `simpleRichText` has no heading styles, so this governs content
                 that cannot exist today. Passed for the same reason every other
                 caller passes it: the day someone widens the answer field, the
                 levels are already right. */
              childLevel={levels.child}
              className="flex flex-col gap-3 pb-4 text-muted-foreground"
            />
          </details>
        ))}
      </div>
    </section>
  )
}

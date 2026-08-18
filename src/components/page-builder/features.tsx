import { Link } from '@/components/link'
import { SectionHeading } from '@/components/page-builder/section-heading'
import { SanityImage, type SanityImageValue } from '@/components/sanity-image'
import { headingTag, type SectionHeadingLevels } from '@/lib/page-builder/heading-outline'
import { type LinkValue, resolveHref } from '@/lib/page-builder/resolve-href'

/** A set of things, laid out as a set.
 *
 *  The schema calls this "List of items" rather than "Features" because the
 *  shape is what earns it a place in the library, not the subject: a services
 *  grid, a category index and a table of contents are the same block with
 *  different words in it.
 *
 *  ## Item names are headings, and their level is the interesting part
 *
 *  Each item's name is a real heading, so someone navigating by heading can
 *  reach the items rather than only the section. `levels.child` is where they
 *  sit — and it moves. A section with a heading of its own puts its items at
 *  `h3` beneath that `h2`. A section with **no** heading has nothing for the
 *  items to be a child of, so they take the section's place at `h2`. That is
 *  rule 3 in `heading-outline.ts`, and it is why `section-fields.ts` can afford
 *  to make the section heading optional.
 *
 *  ## `ul`, not a stack of divs
 *
 *  A screen reader announces "list, four items" before the first one, which is
 *  the information a sighted reader gets for free from the layout.
 */

type FeatureItemValue = {
  readonly _key: string
  readonly heading?: string | null
  readonly body?: string | null
  readonly image?: SanityImageValue | null
  readonly link?: {
    readonly label?: string | null
    readonly destination?: LinkValue | null
  } | null
}

export type FeaturesValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
  readonly intro?: string | null
  readonly items?: readonly FeatureItemValue[] | null
}

type FeaturesProps = {
  readonly value: FeaturesValue
  readonly levels: SectionHeadingLevels
}

export function Features({ value, levels }: FeaturesProps) {
  const items = value.items ?? []
  if (items.length === 0) return null

  const ItemHeading = headingTag(levels.child)

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

      <ul className="grid gap-8 sm:grid-cols-2">
        {items.map((item) => {
          const href = item.link?.destination ? resolveHref(item.link.destination) : null

          return (
            <li key={item._key} className="flex flex-col gap-3">
              {item.image ? (
                <SanityImage
                  value={item.image}
                  width={600}
                  sizes="(min-width: 640px) 50vw, 100vw"
                />
              ) : null}

              {item.heading ? (
                <ItemHeading className="text-balance font-semibold text-lg tracking-tight">
                  {item.heading}
                </ItemHeading>
              ) : null}

              {item.body ? (
                <p className="text-pretty text-muted-foreground">{item.body}</p>
              ) : null}

              {/* Dropped rather than rendered when it does not resolve — the
                  same rule the hero's buttons follow. */}
              {href && item.link?.label ? (
                <Link
                  value={item.link.destination}
                  className="font-medium text-sm underline underline-offset-4 hover:no-underline"
                >
                  {item.link.label}
                </Link>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

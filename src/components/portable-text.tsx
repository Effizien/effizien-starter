import { PortableText, type PortableTextComponents } from '@portabletext/react'

import { Link } from '@/components/link'
import { SanityImage, type SanityImageValue } from '@/components/sanity-image'
import {
  type HeadingLevel,
  headingTag,
  richTextHeadingLevel,
} from '@/lib/page-builder/heading-outline'
import type { LinkValue } from '@/lib/page-builder/resolve-href'
import { cleanBlockStructure } from '@/lib/page-builder/rich-text'

/** Portable Text → React. The only renderer on the site.
 *
 *  ADR-006 records why `@portabletext/react` is a dependency and where the line
 *  sits: the package traverses the document, this file decides what each part
 *  becomes. Everything below is an override — the package's defaults are
 *  deliberately not inherited, for the reason in the next paragraph.
 *
 *  ## Heading levels are computed here, never read from the data
 *
 *  `studio/schemaTypes/objects/rich-text.ts` offers an editor "Heading" and
 *  "Subheading", not `h2` and `h3`, because what those resolve to depends on
 *  where the section sits on the page. `page-builder/heading-outline.ts` is the
 *  rule; `richTextHeadingLevel` is the half of it that applies in here, and it
 *  needs the section's `childLevel` passed in.
 *
 *  The package's own default renders `style` names straight to `<h1>`–`<h6>`,
 *  which is precisely the stored-heading-level behaviour the schema was designed
 *  to prevent. If the `block` overrides below are ever deleted as redundant, the
 *  page silently regains a second `h1` and a heading structure that shifts under
 *  the editor. They are not redundant.
 *
 *  ## `childLevel` has a safe default for a reason
 *
 *  A rich text field rendered outside a page builder — an FAQ answer, a block
 *  previewed on its own in Presentation — has no section above it to be a child
 *  of. `headingTag` already defaults to `h2` for exactly this case, and 2 is the
 *  matching default here.
 */

export type RichTextValue = {
  readonly _type: string
  readonly _key?: string
  readonly style?: string | null
  readonly listItem?: string | null
}

type PortableTextRendererProps = {
  readonly value: readonly RichTextValue[] | null | undefined
  /** The section's `child` level, from `headingOutline`. */
  readonly childLevel?: HeadingLevel
  /** Rendered width for images inside the prose. */
  readonly imageWidth?: number
  readonly className?: string
}

const buildComponents = (
  childLevel: HeadingLevel,
  imageWidth: number,
): PortableTextComponents => {
  /* Computed once per render rather than per block. `richTextHeadingLevel`
     returns null only for styles that are not headings, and `headingTag`
     absorbs that with its own h2 default. */
  const Heading = headingTag(richTextHeadingLevel('heading', childLevel))
  const Subheading = headingTag(richTextHeadingLevel('subheading', childLevel))

  return {
    block: {
      normal: ({ children }) => <p className="text-pretty leading-relaxed">{children}</p>,
      heading: ({ children }) => (
        <Heading className="text-balance font-semibold text-2xl tracking-tight">
          {children}
        </Heading>
      ),
      subheading: ({ children }) => (
        <Subheading className="text-balance font-semibold text-xl tracking-tight">
          {children}
        </Subheading>
      ),
      /* Logical properties, not `border-l` and `pl`. Same reasoning as the
         alignment field storing start/center: a right-to-left locale becomes a
         CSS concern rather than a content migration. */
      blockquote: ({ children }) => (
        <blockquote className="border-border border-s-2 ps-4 text-muted-foreground italic">
          {children}
        </blockquote>
      ),
    },

    list: {
      bullet: ({ children }) => (
        <ul className="flex list-disc flex-col gap-2 ps-6">{children}</ul>
      ),
      number: ({ children }) => (
        <ol className="flex list-decimal flex-col gap-2 ps-6">{children}</ol>
      ),
    },

    listItem: {
      bullet: ({ children }) => (
        <li className="text-pretty leading-relaxed">{children}</li>
      ),
      number: ({ children }) => (
        <li className="text-pretty leading-relaxed">{children}</li>
      ),
    },

    marks: {
      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
      em: ({ children }) => <em>{children}</em>,
      /* The one annotation the schema allows. `Link` resolves internal targets
         through ROUTE and renders an unresolvable destination as plain text
         rather than as a dead anchor. */
      link: ({ children, value }) => (
        <Link
          value={value as LinkValue}
          className="underline underline-offset-4 hover:no-underline"
        >
          {children}
        </Link>
      ),
    },

    types: {
      /* Images in prose go through the same component and therefore the same
         alt-text policy as images anywhere else — which is the reason the schema
         has no separate inline-image type. */
      mediaImage: ({ value }) => (
        <SanityImage value={value as SanityImageValue} width={imageWidth} />
      ),
    },
  }
}

export function PortableTextRenderer({
  value,
  childLevel = 2,
  imageWidth = 800,
  className,
}: PortableTextRendererProps) {
  /* Strips click-to-edit metadata from `style` and `listItem` only. Without it
     every heading in draft mode falls through to the paragraph renderer — see
     `cleanBlockStructure`, which explains why this cannot happen further in. */
  const blocks = cleanBlockStructure(value)

  if (blocks.length === 0) return null

  return (
    <div className={className}>
      <PortableText
        value={blocks}
        components={buildComponents(childLevel, imageWidth)}
        /* Loud in development, silent in production. An unknown block type is a
           schema change that shipped without a renderer, which is worth knowing
           about in a build log and not worth a console warning on a client's
           live site. */
        onMissingComponent={process.env.NODE_ENV === 'production' ? false : undefined}
      />
    </div>
  )
}

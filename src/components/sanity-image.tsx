import Image from 'next/image'
import { stegaClean } from 'next-sanity'

import { cn } from '@/lib/utils'
import { assetDimensions } from '@/sanity/lib/asset-id'
import { urlFor } from '@/sanity/lib/image'

/** An image from the CMS, rendered to the policy the schema already decided.
 *
 *  ## The accessibility policy is rendered here, not reimplemented here
 *
 *  `studio/schemaTypes/objects/media-image.ts` makes an editor answer one
 *  question — does this image mean something, or is it decoration — and holds
 *  the description hostage to the answer. WCAG 2.2 AA (1.1.1) allows exactly two
 *  correct outcomes, and they map straight onto that answer:
 *
 *  - **Decorative** → `alt=""`. An empty alt is not a missing alt: it tells a
 *    screen reader to skip the image entirely, which is the whole point.
 *  - **Informative** → the editor's description.
 *
 *  A *missing* `alt` attribute is the third outcome and the wrong one — the
 *  screen reader falls back to the filename and the visitor hears
 *  "I M G underscore four eight two one dot J P G". `alt` is therefore always
 *  set below, on every path, including the ones that should be unreachable.
 *
 *  ## Every image gets an explicit width
 *
 *  `AGENTS.md` makes this a performance budget: without a width Sanity serves
 *  the original asset, which straight off a camera is several megabytes. The
 *  width is a required prop rather than a default, because the right value is a
 *  layout decision the calling block makes — a hero and an item thumbnail are
 *  not the same picture at different sizes.
 *
 *  Height comes from the asset id (see `assetDimensions`), so the space is
 *  reserved before the image loads and the page does not shift under the reader.
 *
 *  ## A caption is content; a description is a replacement
 *
 *  They are different jobs and the schema says so, which is why a captioned
 *  image renders as a `<figure>` rather than as an image with a paragraph after
 *  it — the association has to be in the markup, not in the visual order.
 */

export type SanityImageValue = {
  readonly asset?: {
    /** Present on an unexpanded reference; `_id` when the query expands it. */
    readonly _ref?: string | null
    readonly _id?: string | null
    readonly metadata?: {
      /** Base64 blur placeholder. Stored because `media-image.ts` sets
       *  `metadata: ['lqip']`; absent unless the query projects it. */
      readonly lqip?: string | null
    } | null
  } | null
  readonly role?: string | null
  readonly alt?: string | null
  readonly caption?: string | null
}

type SanityImageProps = {
  readonly value: SanityImageValue | null | undefined
  /** Rendered width in pixels. Required — see above. */
  readonly width: number
  /** Responsive hint for the browser. Pass one whenever the image is not always
   *  rendered at `width`, or it will download the wrong file on a phone. */
  readonly sizes?: string
  /** Set on the largest above-the-fold image, and nowhere else. */
  readonly priority?: boolean
  readonly className?: string
}

export function SanityImage({
  value,
  width,
  sizes,
  priority,
  className,
}: SanityImageProps) {
  const ref = value?.asset?._ref ?? value?.asset?._id

  /* No asset: an image field the editor left empty. Rendering nothing is
     correct — an empty frame is not a placeholder, it is a defect. */
  if (!value || !ref) return null

  const decorative = stegaClean(value.role) === 'decorative'
  const caption = decorative ? null : value.caption
  const dimensions = assetDimensions(ref)
  const height = dimensions
    ? Math.round((width * dimensions.height) / dimensions.width)
    : undefined

  const image = (
    <Image
      src={urlFor(value).width(width).auto('format').url()}
      /* Never omitted. A decorative image is announced by not being announced;
         an informative one falls back to empty rather than to a filename, which
         the schema's own validation makes close to unreachable. */
      alt={decorative ? '' : (stegaClean(value.alt) ?? '')}
      width={width}
      height={height ?? width}
      sizes={sizes}
      priority={priority}
      placeholder={value.asset?.metadata?.lqip ? 'blur' : undefined}
      blurDataURL={value.asset?.metadata?.lqip ?? undefined}
      className={cn('h-auto max-w-full rounded-lg', className)}
    />
  )

  if (!caption) return image

  return (
    <figure className="flex flex-col gap-2">
      {image}
      <figcaption className="text-muted-foreground text-sm">{caption}</figcaption>
    </figure>
  )
}

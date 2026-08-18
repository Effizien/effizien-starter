/** What a Sanity asset id says about the asset, without asking Sanity.
 *
 * An asset id encodes its own dimensions: `image-<hash>-<width>x<height>-<ext>`.
 * Reading them here means `<SanityImage>` can set an explicit `width` *and*
 * `height` — reserving the right space, so the page does not shift under the
 * reader as images arrive — from a bare `mediaImage` value, with no `asset->`
 * join in the query and no second round trip.
 *
 * ## Why this is not in `image.ts`
 *
 * That module builds CDN URLs and therefore imports `../env`, which throws at
 * import time when the environment is not configured. Parsing a string needs
 * none of that, and a pure function that cannot be tested without a project id
 * is a pure function with a dependency it does not use.
 *
 * ## The twin in the Studio
 *
 * `studio/schemaTypes/shared/image-dimensions.ts` reads the same format, to warn
 * an editor that a sharing image is too small. The duplication is the trade
 * `src/lib/routes.ts` documents at length: the Studio is a separate application
 * and importing across the boundary would drag its dependency tree into this
 * build. Unlike `ROUTE` there is no shared value to drift — both read a format
 * Sanity defines, and neither carries a threshold the other could disagree with.
 */

export type AssetDimensions = {
  readonly width: number
  readonly height: number
}

/** Returns null rather than guessing when the id does not parse. A caller with
 *  no dimensions renders without them and pays a layout shift; a caller handed
 *  invented ones renders every affected image at the wrong shape, with nothing
 *  on the page to indicate why. */
export function assetDimensions(ref: string | null | undefined): AssetDimensions | null {
  if (!ref) return null

  const match = /^image-[^-]+-(\d+)x(\d+)-[a-z0-9]+$/i.exec(ref)
  const width = Number(match?.[1])
  const height = Number(match?.[2])

  /* Zero is as unusable as absent: it divides by zero when the aspect ratio is
     worked out. `Number(undefined)` is NaN, which is also caught here. */
  if (!width || !height) return null

  return { width, height }
}

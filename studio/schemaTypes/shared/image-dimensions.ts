import { SEO_LIMITS } from './seo-limits'

/** Reading an uploaded image's pixel size, and the one warning that depends on it.
 *
 * Two fields need this — the per-page sharing image in `objects/seo.ts` and the
 * site-wide default in `documents/site-settings.ts` — which is why it lives
 * here rather than beside either of them. The regex in particular must not be
 * copied: it encodes an implementation detail of Sanity's asset ids, and a
 * second copy is a second thing to fix when that format changes.
 */

/** Pixel dimensions, read out of the asset id.
 *
 * A Sanity asset id encodes them: `image-<hash>-1200x630-png`. Reading them
 * here costs nothing, where asking the API would mean a network round trip
 * inside a validator that runs on every keystroke.
 *
 * Returns `null` for anything unparseable rather than guessing. A validator
 * that cannot measure an image must pass it — see the policy in
 * `editorial-guardrails.ts`: never block a publish over something the editor
 * cannot act on.
 */
export function imageDimensions(
  ref: string | undefined,
): { width: number; height: number } | null {
  if (!ref) return null

  const match = /^image-[^-]+-(\d+)x(\d+)-[a-z0-9]+$/i.exec(ref)
  const width = match?.[1]
  const height = match?.[2]
  if (!width || !height) return null

  return { width: Number(width), height: Number(height) }
}

/** The minimum an image object has to look like to be measured. Deliberately
 *  loose: a bare `image` and a `mediaImage` differ in their extra fields and
 *  agree on the only one that matters here. */
type ImageValue = { asset?: { _ref?: string } } | undefined

/** Warns when a sharing image is too small to fill a social card.
 *
 * **A warning, never an error.** The image renders — it just renders blurry,
 * which is the textbook "correct but bad" case in `editorial-guardrails.ts`.
 * The editor may also simply not have a larger version, and blocking a publish
 * over something they cannot fix is how validation gets switched off.
 *
 * `siteWide` adds one sentence for `siteSettings.socialImage`, where the
 * consequence is larger: that image is the fallback for every page that has not
 * set its own, so a small one there is what most shared links from the site
 * will look like. The rest of the message is shared so the two fields cannot
 * drift into explaining the same problem differently.
 */
export function shareImageDimensionWarning(options: { siteWide?: boolean } = {}) {
  return (value: unknown): true | string => {
    const dimensions = imageDimensions((value as ImageValue)?.asset?._ref)
    if (!dimensions) return true

    const { width, height } = SEO_LIMITS.openGraphImage
    if (dimensions.width >= width && dimensions.height >= height) return true

    return (
      `This image is ${dimensions.width}×${dimensions.height}. Social networks render ` +
      `the card at ${width}×${height} and will scale this one up to fit, which is what ` +
      'makes a shared link look blurry. Upload a larger version if you have one.' +
      (options.siteWide
        ? ' This one is used by every page that has not set its own, so it is what most ' +
          'shared links from this site will look like.'
        : '')
    )
  }
}

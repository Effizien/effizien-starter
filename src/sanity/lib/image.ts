/* Named import, not default: @sanity/image-url v2 deprecated the default export.
   `SanityImageSource` moved to the package root — the old deep path
   '@sanity/image-url/lib/types/types' no longer resolves. */
import { createImageUrlBuilder, type SanityImageSource } from '@sanity/image-url'

import { dataset, projectId } from '../env'

const builder = createImageUrlBuilder({ projectId, dataset })

/** Build a Sanity CDN URL for an image.
 *
 * Always set a width — `urlFor(img).width(1200).url()`. Without one, Sanity
 * serves the original asset, which for a photo straight off a camera can be
 * several megabytes and will wreck the Core Web Vitals budget the a11y/perf
 * gates in WP6 enforce.
 *
 * Prefer `next/image` over a bare `<img>` so the width actually requested
 * matches the width rendered. */
export function urlFor(source: SanityImageSource) {
  return builder.image(source)
}

/** Asset ids are parsed by `./asset-id`, deliberately kept out of this file:
 *  reading dimensions out of a string needs no project configuration, and this
 *  module throws at import time when the environment is not set up. */

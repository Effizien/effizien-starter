import { describe, expect, it } from 'vitest'

import { assetDimensions } from './asset-id'

/** Dimensions read out of an asset id.
 *
 * This is what lets `<SanityImage>` set a height alongside its explicit width,
 * so the space is reserved before the image arrives and the page does not shift
 * under the reader — Cumulative Layout Shift, which `lighthouserc.json` budgets.
 *
 * The failure that matters is the quiet one: returning a *plausible* number for
 * an id that did not parse would render every affected image at the wrong shape,
 * with nothing to indicate why. Null is the only safe answer.
 */

describe('assetDimensions', () => {
  it('reads the dimensions a Sanity asset id encodes', () => {
    expect(assetDimensions('image-abc123-1200x630-png')).toEqual({
      width: 1200,
      height: 630,
    })
  })

  it('reads a square asset', () => {
    /* The one asset in the seeded dataset, so this is the case the rendered
       site actually exercises today. */
    expect(
      assetDimensions('image-75f05dbadd8d462fb9f18b3449e65fcbcc9e7277-128x128-png'),
    ).toEqual({ width: 128, height: 128 })
  })

  it('handles other extensions', () => {
    expect(assetDimensions('image-abc-800x600-webp')?.width).toBe(800)
    expect(assetDimensions('image-abc-40x40-svg')?.height).toBe(40)
  })

  it('returns null rather than a guess for anything that does not parse', () => {
    expect(assetDimensions('file-abc123-pdf')).toBeNull()
    expect(assetDimensions('image-abc123-png')).toBeNull()
    expect(assetDimensions('not-an-asset-id')).toBeNull()
    expect(assetDimensions('')).toBeNull()
    expect(assetDimensions(null)).toBeNull()
    expect(assetDimensions(undefined)).toBeNull()
  })

  it('returns null for a zero dimension, which would divide by zero downstream', () => {
    expect(assetDimensions('image-abc-0x0-png')).toBeNull()
  })
})

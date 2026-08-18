import { describe, expect, it } from 'vitest'

import { buildArticle } from './build'

/** The structured data that survives a change to a GROQ projection.
 *
 * These do not test schema.org. They test the seam where a *query* change can
 * silently remove a claim from the markup, which is the failure this file's
 * builders are most exposed to and the one nothing else catches: the page still
 * renders, the JSON-LD is still valid, and a property has simply gone.
 */

const ASSET = 'image-2328facb13a37db6dc9034fd28478dd1f184a10f-1024x400-png'

const article = (mainImage: unknown) => ({
  title: 'How long a flat roof actually lasts',
  excerpt: 'Twenty years, if it drains.',
  publishedAt: '2026-08-01T09:00:00Z',
  _updatedAt: '2026-08-10T09:00:00Z',
  mainImage: mainImage as never,
  author: { name: 'Jane Cooper', role: 'Surveyor' },
  topics: [{ title: 'Flat roofing' }],
})

describe('buildArticle — the image survives either projection shape', () => {
  /* A query that leaves the asset as a reference gives `_ref`; one that expands
     it with `asset->` to reach `metadata.lqip` gives `_id`. Both name the same
     asset. Before WP12 chunk 4 this builder tested `_ref` alone, so expanding
     `mainImage` for the renderer — which chunk 4 does — would have dropped the
     image from the Article markup with nothing failing anywhere. */

  it('builds an image from an unexpanded asset reference', () => {
    const result = buildArticle(article({ asset: { _ref: ASSET } }), '/blog/x')

    expect(result?.image).toBeDefined()
    expect(result?.image?.url).toContain('2328facb')
  })

  it('builds an image from an expanded asset', () => {
    const result = buildArticle(
      article({ asset: { _id: ASSET, metadata: { lqip: 'data:image/png;base64,AA' } } }),
      '/blog/x',
    )

    expect(result?.image).toBeDefined()
    expect(result?.image?.url).toContain('2328facb')
  })

  it('produces the same URL either way, because it is the same asset', () => {
    const fromRef = buildArticle(article({ asset: { _ref: ASSET } }), '/blog/x')
    const fromId = buildArticle(article({ asset: { _id: ASSET } }), '/blog/x')

    expect(fromRef?.image?.url).toBe(fromId?.image?.url)
  })

  it('omits the image when there is no asset at all', () => {
    expect(buildArticle(article(null), '/blog/x')?.image).toBeUndefined()
    expect(buildArticle(article({}), '/blog/x')?.image).toBeUndefined()
  })
})

describe('buildArticle — what it derives from the article itself', () => {
  it('takes the headline from the title, never from an SEO override', () => {
    const result = buildArticle(article(null), '/blog/x')

    expect(result?.headline).toBe('How long a flat roof actually lasts')
  })

  it('states the author and their role', () => {
    const result = buildArticle(article(null), '/blog/x')

    expect(result?.author).toEqual({
      '@type': 'Person',
      name: 'Jane Cooper',
      jobTitle: 'Surveyor',
    })
  })

  it('returns null without a title, rather than an unusable node', () => {
    expect(buildArticle({ title: null }, '/blog/x')).toBeNull()
    expect(buildArticle(null, '/blog/x')).toBeNull()
  })
})

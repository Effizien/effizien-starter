import { describe, expect, it } from 'vitest'

import { isExternalHref, resolveHref } from './resolve-href'

/** Where a link goes, and what happens when it cannot go anywhere.
 *
 * Two properties matter here and neither is visible in a rendered page:
 *
 * 1. **Every address comes from `ROUTE`.** These tests assert the resulting
 *    strings, so moving `/blog/` to `/articles/` in `src/lib/routes.ts` fails
 *    here as well as in `tests/routes-mirror.test.ts` — which is the point. A
 *    path written by hand in a component would pass both.
 * 2. **A link that cannot resolve returns null, never `''`.** An empty href is
 *    a live-looking anchor that navigates to the top of the current page.
 */

/** Four characters from the stega alphabet — the run length the encoder's own
 *  regex requires. Written as escapes because the real ones are zero-width and
 *  would be invisible in this file, which is the entire problem they cause.
 *
 *  These are the characters Sanity actually uses (U+200B, U+200C, U+200D,
 *  U+FEFF), verified against `@vercel/stega`, which `@sanity/client` encodes
 *  with. They are **not** the U+E0000 tag block. */
const STEGA = '​‌‍﻿'

describe('resolveHref — internal destinations come from ROUTE', () => {
  const internal = (type: string, slug?: string) => ({
    linkType: 'internal',
    internalTarget: { _type: type, slug },
  })

  it('builds a page address', () => {
    expect(resolveHref(internal('page', 'about'))).toBe('/about')
  })

  it('builds an article address', () => {
    expect(resolveHref(internal('post', 'how-long-a-flat-roof-lasts'))).toBe(
      '/blog/how-long-a-flat-roof-lasts',
    )
  })

  it('builds a documentation address', () => {
    expect(resolveHref(internal('docPage', 'getting-started'))).toBe(
      '/docs/getting-started',
    )
  })

  it('sends the home page to the root, with no slug to build from', () => {
    expect(resolveHref(internal('homePage'))).toBe('/')
  })

  it('reaches the blog index as an ordinary page, because that is what it is', () => {
    /* `/blog` is a `page` whose builder holds an articleList — there is no
       separate document type for it, so no separate route. */
    expect(resolveHref(internal('page', 'blog'))).toBe('/blog')
  })
})

describe('resolveHref — destinations that cannot resolve', () => {
  it('returns null for a type ROUTE has no address for', () => {
    /* `product` is a linkable type on a catalogue site and its routes are not
       built. Null lets the caller render text; '' would render a dead link. */
    expect(
      resolveHref({
        linkType: 'internal',
        internalTarget: { _type: 'product', slug: 'x' },
      }),
    ).toBeNull()
  })

  it('returns null when the chosen page has no slug', () => {
    expect(
      resolveHref({ linkType: 'internal', internalTarget: { _type: 'page' } }),
    ).toBeNull()
  })

  it('returns null when the editor never chose a page', () => {
    expect(resolveHref({ linkType: 'internal' })).toBeNull()
  })

  it('returns null when the editor never chose a link type', () => {
    expect(resolveHref({ externalUrl: 'https://example.com' })).toBeNull()
  })

  it('returns null for an external link with no address', () => {
    expect(resolveHref({ linkType: 'external', externalUrl: '' })).toBeNull()
    expect(resolveHref({ linkType: 'external' })).toBeNull()
  })

  it('returns null for nothing at all', () => {
    expect(resolveHref(null)).toBeNull()
    expect(resolveHref(undefined)).toBeNull()
  })
})

describe('resolveHref — external destinations pass through', () => {
  it('keeps a web address', () => {
    expect(
      resolveHref({ linkType: 'external', externalUrl: 'https://www.nfrc.co.uk/' }),
    ).toBe('https://www.nfrc.co.uk/')
  })

  it('keeps mailto and tel, which the schema allows', () => {
    expect(
      resolveHref({ linkType: 'external', externalUrl: 'mailto:hello@example.com' }),
    ).toBe('mailto:hello@example.com')
    expect(resolveHref({ linkType: 'external', externalUrl: 'tel:+441234567890' })).toBe(
      'tel:+441234567890',
    )
  })
})

describe('resolveHref — draft mode does not break links', () => {
  /* In Presentation every string carries click-to-edit metadata. A bare
     comparison against 'internal' fails, the link stops resolving, and it does
     so only for the editor — who is at that moment deciding whether the CMS
     works. */

  it('resolves an internal link whose linkType carries stega metadata', () => {
    expect(
      resolveHref({
        linkType: `internal${STEGA}`,
        internalTarget: { _type: 'page', slug: 'pricing' },
      }),
    ).toBe('/pricing')
  })

  it('resolves an external link whose linkType carries stega metadata', () => {
    expect(
      resolveHref({ linkType: `external${STEGA}`, externalUrl: 'https://example.com' }),
    ).toBe('https://example.com')
  })

  it('builds a clean address from a slug carrying stega metadata', () => {
    /* Not just a resolution failure — an unclean slug produces a URL with
       invisible characters in it, which 404s. */
    expect(
      resolveHref({
        linkType: 'internal',
        internalTarget: { _type: 'page', slug: `about${STEGA}` },
      }),
    ).toBe('/about')
  })

  it('builds a clean address from a document type carrying stega metadata', () => {
    expect(
      resolveHref({
        linkType: 'internal',
        internalTarget: { _type: `post${STEGA}`, slug: 'hello' },
      }),
    ).toBe('/blog/hello')
  })

  it('strips stega from an external address', () => {
    expect(
      resolveHref({ linkType: 'external', externalUrl: `https://example.com${STEGA}` }),
    ).toBe('https://example.com')
  })
})

describe('isExternalHref', () => {
  it('treats a site-relative path as internal', () => {
    expect(isExternalHref('/')).toBe(false)
    expect(isExternalHref('/blog/hello')).toBe(false)
  })

  it('treats anything with a scheme as external', () => {
    expect(isExternalHref('https://example.com')).toBe(true)
    expect(isExternalHref('mailto:hello@example.com')).toBe(true)
    expect(isExternalHref('tel:+441234567890')).toBe(true)
  })
})

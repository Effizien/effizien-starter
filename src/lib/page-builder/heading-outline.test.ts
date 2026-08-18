import { describe, expect, it } from 'vitest'

import { headingOutline, headingTag, richTextHeadingLevel } from './heading-outline'

/** The heading outline, tested before the thing that implements it exists.
 *
 * `heading-outline.ts` has had no consumer since it was written — WP12 builds
 * the renderer that will use it. That ordering is deliberate (see WP6 in
 * `03-BUILD-PLAN.md`): a test written after the renderer would encode whatever
 * the renderer does, bugs included. Written first, it is the specification, and
 * WP12's job is to satisfy it.
 *
 * The rule these protect, from the file's own doc comment and WCAG 2.2 AA
 * (1.3.1, 2.4.6): **exactly one `h1` per page**. Either the first section
 * supplies it, or the renderer emits the document title above the sections —
 * **never both, never neither**. The obvious wrong implementation ("always emit
 * the title as `h1`") produces two `h1`s on every page whose first section has
 * a heading, and renders without any visible sign of being wrong.
 */

const section = (key: string, heading?: string) => ({ _key: key, heading })

describe('headingOutline — who supplies the h1', () => {
  it('gives the h1 to the first section when it declares a heading', () => {
    const outline = headingOutline([section('a', 'Opening'), section('b', 'Second')])

    expect(outline.documentTitleIsPageHeading).toBe(false)
    expect(outline.levels.a?.section).toBe(1)
    expect(outline.levels.b?.section).toBe(2)
  })

  it('falls back to the document title when the first section has no heading', () => {
    const outline = headingOutline([section('a'), section('b', 'Second')])

    expect(outline.documentTitleIsPageHeading).toBe(true)
    /* No heading of its own, so nothing to be a level — its children take its
       place instead, checked below. */
    expect(outline.levels.a?.section).toBeNull()
    expect(outline.levels.b?.section).toBe(2)
  })

  it('never produces two h1s', () => {
    const outline = headingOutline([
      section('a', 'Opening'),
      section('b', 'Second'),
      section('c', 'Third'),
    ])

    const h1s = Object.values(outline.levels).filter((l) => l.section === 1)
    expect(h1s).toHaveLength(1)
    expect(outline.documentTitleIsPageHeading).toBe(false)
  })

  it('never produces zero h1s — the title supplies one when no section does', () => {
    const outline = headingOutline([section('a'), section('b')])

    const h1s = Object.values(outline.levels).filter((l) => l.section === 1)
    expect(h1s).toHaveLength(0)
    expect(outline.documentTitleIsPageHeading).toBe(true)
  })

  it('treats a whitespace-only heading as no heading', () => {
    const outline = headingOutline([section('a', '   '), section('b', 'Second')])

    expect(outline.documentTitleIsPageHeading).toBe(true)
    expect(outline.levels.a?.section).toBeNull()
  })

  it('treats a stega-only heading as no heading', () => {
    /* Sanity hides click-to-edit metadata in these characters. A heading made
       only of them is visually empty but not string-empty, so a naive check
       makes every heading look present in draft mode and nowhere else — a bug
       that appears only for the editor, which is the worst kind.

       ⚠️ **The characters below were wrong until WP12**, and this is the one
       fixture in this file that changed. It used to read `\u{E0001}\u{E0020}` —
       the Unicode Tags block, which Sanity's encoder never emits. The test
       passed because the implementation stripped the same invented range, so
       the two agreed with each other and both disagreed with the encoder.

       These are the real ones: `@sanity/client` encodes via `@vercel/stega`,
       whose alphabet is U+200B, U+200C, U+200D and U+FEFF, matched in runs of
       four or more. Written as escapes because they are zero-width and would
       otherwise be invisible here — which is exactly what made the original
       mistake survive review. */
    const stega = '​‌‍﻿'
    const outline = headingOutline([section('a', stega), section('b')])

    expect(outline.documentTitleIsPageHeading).toBe(true)
    expect(outline.levels.a?.section).toBeNull()
  })

  it('treats a whitespace heading carrying stega metadata as no heading', () => {
    /* The case the wrong character range actually broke: in Presentation this
       section claimed the page's h1, rendered it empty, and left the document
       title as ordinary text. Neither of the two tests above catches it —
       whitespace alone is not encoded, and a stega-only string is not what an
       editor produces. A half-filled heading in draft mode is. */
    const outline = headingOutline([section('a', `   ​‌‍﻿`), section('b', 'Second')])

    expect(outline.documentTitleIsPageHeading).toBe(true)
    expect(outline.levels.a?.section).toBeNull()
    expect(outline.levels.b?.section).toBe(2)
  })

  it('has the document supply the h1 when there are no sections at all', () => {
    expect(headingOutline([]).documentTitleIsPageHeading).toBe(true)
    expect(headingOutline(null).documentTitleIsPageHeading).toBe(true)
    expect(headingOutline(undefined).documentTitleIsPageHeading).toBe(true)
  })
})

describe('headingOutline — what level a section’s contents get', () => {
  it('puts contents one level below a section that has its own heading', () => {
    const outline = headingOutline([section('a', 'Opening'), section('b', 'Second')])

    expect(outline.levels.a?.child).toBe(2)
    expect(outline.levels.b?.child).toBe(3)
  })

  it('promotes contents to the section’s own level when it has no heading', () => {
    /* The rule that makes derivation necessary rather than a nicety: with no
       heading of its own there is no h2 above these to be a child of, so they
       take its place. A hardcoded "always h3" leaves a gap here. */
    const outline = headingOutline([section('a', 'Opening'), section('b')])

    expect(outline.levels.b?.section).toBeNull()
    expect(outline.levels.b?.child).toBe(2)
  })
})

describe('richTextHeadingLevel — relative, not absolute', () => {
  it('maps Heading to the section’s child level and Subheading one below', () => {
    expect(richTextHeadingLevel('heading', 3)).toBe(3)
    expect(richTextHeadingLevel('subheading', 3)).toBe(4)
  })

  it('shifts with the section, which is why the styles are not called h2 and h3', () => {
    expect(richTextHeadingLevel('heading', 2)).toBe(2)
    expect(richTextHeadingLevel('subheading', 2)).toBe(3)
  })

  it('returns null for body copy', () => {
    expect(richTextHeadingLevel('normal', 3)).toBeNull()
    expect(richTextHeadingLevel(undefined, 3)).toBeNull()
  })

  it('never goes past h6', () => {
    expect(richTextHeadingLevel('subheading', 6)).toBe(6)
  })
})

describe('headingTag', () => {
  it('renders a level as its tag', () => {
    expect(headingTag(1)).toBe('h1')
    expect(headingTag(3)).toBe('h3')
  })

  it('defaults to h2 for a section rendered outside a page builder', () => {
    expect(headingTag(null)).toBe('h2')
    expect(headingTag(undefined)).toBe('h2')
  })
})

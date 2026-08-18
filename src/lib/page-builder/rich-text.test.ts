import { describe, expect, it } from 'vitest'

import { cleanBlockStructure } from './rich-text'

/** The two fields Portable Text dispatches on, and the ones it must not touch.
 *
 * `@portabletext/react` selects a component by matching `style` and `listItem`
 * against the keys of the components map. That match happens inside the library,
 * so a value carrying click-to-edit metadata matches nothing and falls through
 * to the default paragraph renderer — every heading in every rich text field
 * becomes body copy, for the editor only, in Presentation only.
 *
 * The other half is just as important: the **text** must keep its metadata, or
 * cleaning the bug away also removes the click-to-edit overlay that makes
 * Presentation worth having.
 */

/** See the note in `resolve-href.test.ts` — these are the characters Sanity's
 *  encoder actually uses, at the run length its regex requires. */
const STEGA = '​‌‍﻿'

/** Declared rather than inferred. `cleanBlockStructure` is generic over the
 *  block type, so an inferred object literal would narrow `T` to whatever the
 *  fixture happened to spread in and the assertions below would not typecheck. */
type TestBlock = {
  _type: string
  _key?: string
  style?: string | null
  listItem?: string | null
  children?: { _type: string; _key: string; text: string }[]
}

const block = (overrides: Partial<TestBlock> = {}): TestBlock => ({
  _type: 'block',
  _key: 'a',
  style: 'normal',
  children: [{ _type: 'span', _key: 's', text: 'Words' }],
  ...overrides,
})

describe('cleanBlockStructure — what it strips', () => {
  it('cleans a style so the renderer can dispatch on it', () => {
    const [cleaned] = cleanBlockStructure([block({ style: `heading${STEGA}` })])

    expect(cleaned?.style).toBe('heading')
  })

  it('cleans a list item type', () => {
    const [cleaned] = cleanBlockStructure([
      block({ style: 'normal', listItem: `bullet${STEGA}` }),
    ])

    expect(cleaned?.listItem).toBe('bullet')
  })

  it('leaves a clean value exactly as it was', () => {
    const [cleaned] = cleanBlockStructure([block({ style: 'blockquote' })])

    expect(cleaned?.style).toBe('blockquote')
  })

  it('leaves an absent style absent rather than inventing one', () => {
    const bare: TestBlock = { _type: 'block', _key: 'a' }
    const [cleaned] = cleanBlockStructure([bare])

    expect(cleaned?.style).toBeUndefined()
  })
})

describe('cleanBlockStructure — what it must not strip', () => {
  it('leaves the text alone, because that is what draws the edit overlay', () => {
    const withText = block({
      style: `heading${STEGA}`,
      children: [{ _type: 'span', _key: 's', text: `Words${STEGA}` }],
    })

    const [cleaned] = cleanBlockStructure([withText])
    const children = cleaned?.children as { text: string }[]

    expect(cleaned?.style).toBe('heading')
    expect(children[0]?.text).toBe(`Words${STEGA}`)
  })

  it('passes non-block members through untouched', () => {
    /* An image in the middle of a rich text field is dispatched by `_type`,
       which begins with an underscore and is never encoded. */
    const image = { _type: 'mediaImage', _key: 'i', role: 'decorative' }

    const [cleaned] = cleanBlockStructure([image])

    expect(cleaned).toBe(image)
  })
})

describe('cleanBlockStructure — nothing to render', () => {
  it('returns an empty array for an empty or absent field', () => {
    expect(cleanBlockStructure([])).toEqual([])
    expect(cleanBlockStructure(null)).toEqual([])
    expect(cleanBlockStructure(undefined)).toEqual([])
  })
})

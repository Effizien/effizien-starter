import { describe, expect, it } from 'vitest'

import { headingOutline } from '../src/lib/page-builder/heading-outline'
import {
  describeHeadingOutlineProblem,
  describeSectionOrderProblem,
} from '../studio/schemaTypes/shared/heading-outline'

/** The Studio's validators and the app's derivation are two halves of one policy.
 *
 * ## They are not duplicated code, despite what the comments imply
 *
 * Both files describe themselves as halves of a deliberately duplicated pair.
 * They are not: they share no logic and export nothing in common. The app
 * **derives** heading levels from section order; the Studio **validates** the
 * two things derivation cannot fix for an editor — a subheading with no heading
 * above it, and an opening section that is not at the top.
 *
 * What can drift is not an implementation. It is the **assumption each makes
 * about the other**, which no compiler checks and no single-file test would
 * catch. That is what this file tests.
 *
 * ## The property that has to hold
 *
 * **Any page the Studio lets an editor publish must derive to exactly one `h1`.**
 * If the Studio accepts an arrangement the renderer turns into two `h1`s or
 * none, the page is broken in a way that renders without any visible sign —
 * which is the exact failure both files were written to prevent.
 *
 * ## One asymmetry found while writing this, and deliberately left alone
 *
 * The Studio's `describeSectionOrderProblem` reasons about `hero` specifically:
 * it requires a hero to be first and to be the only one. The app's
 * `headingOutline` does not care about types at all — it gives the `h1` to
 * whatever section is first *and declares a heading*.
 *
 * So the Studio is **stricter** than the app requires: it rejects
 * `[textSection with heading, hero]`, which the app would have derived
 * correctly as `h1, h2`. That is a conservative validator rather than a defect,
 * and the property below still holds. Recorded because "the Studio is stricter"
 * is a fact a future change could quietly invert into "the Studio is looser",
 * which would be a defect.
 */

type Section = { _key: string; _type: string; heading?: string }

const hero = (key: string, heading = 'Opening'): Section => ({
  _key: key,
  _type: 'hero',
  heading,
})
const text = (key: string, heading?: string): Section => ({
  _key: key,
  _type: 'textSection',
  heading,
})

/** Arrangements an editor could plausibly build. Each is run through the Studio
 *  first; only the ones it accepts are held to the one-`h1` property. */
const ARRANGEMENTS: { name: string; sections: Section[] }[] = [
  { name: 'hero first, then text', sections: [hero('a'), text('b', 'Second')] },
  { name: 'hero alone', sections: [hero('a')] },
  {
    name: 'no hero, text with heading first',
    sections: [text('a', 'Opening'), text('b')],
  },
  { name: 'no hero, no headings at all', sections: [text('a'), text('b')] },
  {
    name: 'no hero, heading only on the second',
    sections: [text('a'), text('b', 'Two')],
  },
  { name: 'empty page', sections: [] },
  { name: 'two heroes', sections: [hero('a'), hero('b')] },
  { name: 'hero not first', sections: [text('a', 'Opening'), hero('b')] },
  { name: 'hero not first, no heading above', sections: [text('a'), hero('b')] },
]

const studioAccepts = (sections: Section[]) =>
  describeSectionOrderProblem(sections) === true

describe('the Studio never accepts a page that derives to the wrong number of h1s', () => {
  it.each(ARRANGEMENTS.filter(({ sections }) => studioAccepts(sections)))(
    'accepts "$name", which derives to exactly one h1',
    ({ sections }) => {
      const outline = headingOutline(sections)
      const sectionH1s = Object.values(outline.levels).filter((l) => l.section === 1)

      /* Exactly one, from exactly one source. Both-or-neither is the failure. */
      const total = sectionH1s.length + (outline.documentTitleIsPageHeading ? 1 : 0)
      expect(total).toBe(1)
    },
  )
})

describe('the Studio rejects the arrangements it is meant to', () => {
  it('rejects a second opening section', () => {
    expect(describeSectionOrderProblem([hero('a'), hero('b')])).not.toBe(true)
  })

  it('rejects an opening section that is not at the top', () => {
    expect(describeSectionOrderProblem([text('a'), hero('b')])).not.toBe(true)
  })

  it('points the marker at the offending section so the editor can find it', () => {
    const problem = describeSectionOrderProblem([hero('a'), hero('second-hero')])
    expect(problem).not.toBe(true)
    if (problem === true) return
    expect(problem.path).toEqual([{ _key: 'second-hero' }])
  })

  it('accepts a page with no opening section at all', () => {
    /* Not every page has a hero, and the document title supplies the h1 then. */
    expect(describeSectionOrderProblem([text('a'), text('b')])).toBe(true)
  })
})

describe('rich text cannot open with a subheading', () => {
  const block = (key: string, style: string) => ({ _key: key, _type: 'block', style })

  it('rejects a subheading with no heading above it', () => {
    const problem = describeHeadingOutlineProblem([block('a', 'subheading')])
    expect(problem).not.toBe(true)
    if (problem === true) return
    expect(problem.path).toEqual([{ _key: 'a' }])
  })

  it('accepts a subheading that follows a heading', () => {
    expect(
      describeHeadingOutlineProblem([block('a', 'heading'), block('b', 'subheading')]),
    ).toBe(true)
  })

  it('ignores body copy between the two', () => {
    expect(
      describeHeadingOutlineProblem([
        block('a', 'heading'),
        block('b', 'normal'),
        block('c', 'subheading'),
      ]),
    ).toBe(true)
  })

  it('accepts text with no headings at all', () => {
    expect(describeHeadingOutlineProblem([block('a', 'normal')])).toBe(true)
  })
})

import type { Path, ValidationError } from 'sanity'

/** Heading levels: the whole policy, in one file.
 *
 *  WCAG 2.2 AA leans on headings twice over — 1.3.1 (Info and Relationships)
 *  and 2.4.6 (Headings and Labels). A screen reader user navigates a long page
 *  by jumping heading to heading, and the *level* is the only thing telling them
 *  whether the next heading is a sibling or a child. `h1 → h3` reads as "a level
 *  went missing here", and there is no way for them to tell whether they skipped
 *  something.
 *
 *  ## No block stores its heading level
 *
 *  There is no `level` field anywhere in this schema, and there will not be one.
 *  A stored level is correct at the moment the editor sets it and wrong the first
 *  time anyone drags section four above section one — and nothing in the Studio
 *  notices, because the value is still a perfectly valid `h3`. The failure is
 *  silent, invisible in the Studio, invisible in the browser, and only shows up
 *  in an audit months later.
 *
 *  Nor is a level hardcoded per block. "Every block renders an `h2`" is the other
 *  common answer, and it breaks the moment a page has no `h1` (a page-builder
 *  page whose first section is a plain text section), or has two (a hero
 *  declaring one, plus the document title rendered above it).
 *
 *  ## Levels are derived from position, by the renderer
 *
 *  `src/lib/page-builder/heading-outline.ts` is the other half of this file. It
 *  walks the sections once and assigns:
 *
 *    h1   the first section's heading, if the first section declares one;
 *         otherwise the document title, which the renderer emits itself
 *    h2   every other section heading
 *    h3   headings *inside* a section that has its own heading — item names in a
 *         features list, questions in an FAQ, "Heading" inside rich text
 *    h2   those same inner headings when their section has no heading of its
 *         own, because there is no h2 above them to be a child of
 *
 *  The last line is why this is derived rather than fixed. A section heading is
 *  optional on most blocks — forcing one produces junk headings like "Features"
 *  above four obvious features — and when it is absent the level of everything
 *  underneath shifts up by one. That is a page-shaped decision. No individual
 *  block can make it, which is exactly why no individual block is asked to.
 *
 *  Two consequences worth stating, because they are what the two validators
 *  below exist to protect:
 *
 *  1. The page has exactly one `h1`. Either a section supplies it or the
 *     document title does, never both — see `describeSectionOrderProblem`.
 *  2. Rich text can only go one level deeper than its own section, never two —
 *     see `describeHeadingOutlineProblem`.
 *
 *  ## Why the rich-text styles are not called h2 and h3
 *
 *  `richText` offers "Heading" and "Subheading", whose stored values are
 *  `heading` and `subheading`. They are *relative*: "Heading" means one level
 *  below whatever section contains it, which is an `h3` in a section that has a
 *  heading and an `h2` in one that does not. Naming them `h2`/`h3` would bake an
 *  absolute answer into the data — the same mistake as a `level` field, just
 *  spelled differently — and would be wrong for half the pages that use it.
 */

/** Path to an array member the Studio can point a validation marker at.
 *
 *  Relative to the value being validated, not to the document. */
const pathToItem = (key: unknown): Path =>
  typeof key === 'string' && key.length > 0 ? [{ _key: key }] : []

type StyledBlock = {
  _key?: unknown
  _type?: unknown
  style?: unknown
}

/** A "Subheading" with no "Heading" above it, inside one rich-text field.
 *
 *  This is the one heading mistake an editor can make that derivation cannot fix
 *  for them: the renderer honours the styles it is given, so a subheading opening
 *  a section renders one level below where the outline is — a skipped level, on
 *  purpose, in the data. Everything else about levels is computed, so there is
 *  nothing else to validate. */
export const describeHeadingOutlineProblem = (value: unknown): true | ValidationError => {
  if (!Array.isArray(value)) return true

  let headingSeen = false

  for (const entry of value as StyledBlock[]) {
    if (entry?._type !== 'block') continue
    if (entry.style === 'heading') {
      headingSeen = true
      continue
    }
    if (entry.style === 'subheading' && !headingSeen) {
      return {
        message:
          'This is a Subheading, but nothing above it in this text is a Heading. A subheading belongs underneath a heading — on its own it leaves a gap in the page structure, and someone navigating by headings hears that a level is missing without being able to tell what they missed. Change it to Heading, or add a Heading above it.',
        path: pathToItem(entry._key),
      }
    }
  }

  return true
}

/** The section that carries the page's main heading has to be the first one.
 *
 *  A hero is the only block whose heading is mandatory *and* whose job is to open
 *  the page, so it is the block the renderer takes the `h1` from. Two of them
 *  gives the page two main headings; one halfway down gives the page an `h1`
 *  after several `h2`s. Both are structural defects that render without any
 *  visible sign of being wrong, so the Studio has to be the thing that catches
 *  them. */
export const describeSectionOrderProblem = (value: unknown): true | ValidationError => {
  if (!Array.isArray(value)) return true

  const sections = value as StyledBlock[]
  const heroes = sections
    .map((section, index) => ({ section, index }))
    .filter(({ section }) => section?._type === 'hero')

  const first = heroes[0]
  if (!first) return true

  const second = heroes[1]
  if (second) {
    return {
      message:
        'This page has two opening sections. The first one gives the page its main heading, so a second one gives the page two — which search engines and screen readers both read as a structural mistake, and neither tells you about it. Keep the one at the top and rebuild this one as a text section or a call to action.',
      path: pathToItem(second.section._key),
    }
  }

  if (first.index !== 0) {
    return {
      message:
        'The opening section is not at the top of the page. It carries the page’s main heading, so everything above it is a heading that outranks the page’s own title. Drag it to the top, or rebuild it as a text section if the content really belongs here.',
      path: pathToItem(first.section._key),
    }
  }

  return true
}

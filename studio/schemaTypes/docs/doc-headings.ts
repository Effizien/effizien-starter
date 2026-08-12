import type { Path, ValidationError } from 'sanity'

import { toSlug } from '../shared/slug-field'

/** The headings inside a documentation page, and the table of contents nobody
 *  types.
 *
 *  ## There is no table-of-contents field, and there will not be one
 *
 *  The "On this page" list down the side of a documentation page is the single
 *  most common thing to get modelled by hand — an array of `{label, anchor}`
 *  pairs an editor fills in after writing the page. It is wrong every time. It
 *  is correct at the moment it is typed and stale the first time anyone adds a
 *  heading, renames one, or moves one, and *nothing* reports the drift: the page
 *  renders, the contents list renders, and it quietly describes a page that no
 *  longer exists. It also doubles the work of every edit, which is how it ends up
 *  half-maintained rather than unmaintained — worse, because it still looks
 *  authoritative.
 *
 *  So the contents list is derived. The renderer walks `body`, takes every
 *  `heading` and `subheading` block, and builds the list from the text the editor
 *  already wrote. `docHeadings` below is that walk, written once here so the
 *  Studio and the frontend agree about what counts as a heading.
 *
 *  ## Anchors come from the heading text
 *
 *  Each heading gets an `id` so it can be linked to: `/docs/install#requirements`.
 *  That id is `toSlug(headingText)` — the same function that turns a page title
 *  into a web address, reused rather than reinvented so that "Prüfen & testen"
 *  produces `pruefen-testen` in an anchor exactly as it would in a slug.
 *
 *  Two alternatives were considered and rejected:
 *
 *  - **The block's `_key`.** Stable, unique, and free. Also meaningless:
 *    `#a3f8c2b1` is unreadable, unguessable, unspeakable over the phone, and
 *    tells a search engine nothing. Deep links into documentation get pasted
 *    into support tickets and read out loud; they have to say something.
 *  - **An explicit `anchor` field per heading.** That is the hand-maintained
 *    table of contents again, one level down.
 *
 *  The cost of deriving from text is that renaming a heading changes its anchor
 *  and any deep link to the old one lands at the top of the page instead. That is
 *  a real loss and it is the smaller one: a heading rename is rare and its blast
 *  radius is one fragment, where a stale contents list misdescribes the whole
 *  page continuously.
 *
 *  ## What the validator below is actually protecting
 *
 *  Only one thing can go wrong that derivation cannot fix by itself: two headings
 *  on one page reducing to the same anchor — two sections both headed "Example",
 *  or "Install" and "install." with a full stop. The frontend has to break the tie
 *  somehow, and the usual answer, which this schema assumes, is to suffix later
 *  duplicates: `example`, `example-2`. The moment it does, those anchors depend on
 *  the *order* of the headings rather than on their text. Reorder the page and
 *  `example-2` silently points at a different section. Nothing renders wrongly,
 *  nothing errors, and the deep link in someone's support ticket now goes to the
 *  wrong paragraph.
 *
 *  It warns rather than blocks. Repeating a heading like "Example" under three
 *  different topics is legitimate writing, and an editor who cannot publish until
 *  they have renamed it learns to distrust the Studio. The message says what will
 *  happen and how to make the headings distinguishable.
 *
 *  ## The contract this places on the frontend (WP5)
 *
 *  `src/lib/docs/headings.ts` must derive anchors with the *same* normalisation.
 *  The Studio and the app are separate applications with separate dependencies,
 *  so this function cannot be imported across the boundary — it has to be
 *  reimplemented, and if the two drift, every anchor on the site breaks at once
 *  with no error anywhere. Treat that duplication as a fixture-tested contract,
 *  not as two functions that happen to look alike.
 */

/** How long an anchor may get before it stops being something anyone can read
 *  out or paste into a message without it wrapping. Shorter than a slug on
 *  purpose: an anchor is appended to an address that is already long. */
const ANCHOR_MAX_LENGTH = 64

/** The rich-text styles that become headings on the page. These are the two
 *  offered by `docBody`, and they are *relative* levels — see
 *  `shared/heading-outline.ts` for why no level is ever stored. */
const HEADING_STYLES = new Set(['heading', 'subheading'])

type PortableTextSpan = { _type?: unknown; text?: unknown }
type PortableTextBlock = {
  _key?: unknown
  _type?: unknown
  style?: unknown
  children?: unknown
}

/** Path to an array member the Studio can point a validation marker at.
 *  Relative to the value being validated, not to the document. */
const pathToItem = (key: unknown): Path =>
  typeof key === 'string' && key.length > 0 ? [{ _key: key }] : []

/** The visible text of one block, with formatting flattened away.
 *
 *  A heading that is half bold arrives as several spans; embedded objects (an
 *  inline link annotation applies to spans, but a `codeBlock` sitting in the same
 *  array is not a block at all) arrive as things with no `children`. Hence the
 *  guards rather than a chain of optional accesses. */
const blockText = (block: PortableTextBlock): string =>
  (Array.isArray(block.children) ? block.children : [])
    .filter(
      (child): child is PortableTextSpan => typeof child === 'object' && child !== null,
    )
    .filter((child) => child._type === 'span')
    .map((child) => (typeof child.text === 'string' ? child.text : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

export type DocHeading = {
  /** The block's `_key`. Use it as the React key, and as the thing a validation
   *  marker points at. */
  key: string
  /** `heading` or `subheading` — relative, never `h2`/`h3`. The renderer resolves
   *  those to absolute levels; see `shared/heading-outline.ts`. */
  style: string
  /** The words the editor wrote. */
  text: string
  /** The `id` this heading is given, and the fragment a link to it uses. Empty
   *  when the heading contains nothing an address can carry. */
  anchor: string
}

/** Every heading in a documentation body, in document order.
 *
 *  This *is* the table of contents. The renderer groups it by `style` and the
 *  Studio uses it to check the anchors are distinguishable; neither stores it. */
export const docHeadings = (value: unknown): DocHeading[] => {
  if (!Array.isArray(value)) return []

  const headings: DocHeading[] = []

  for (const entry of value as PortableTextBlock[]) {
    if (typeof entry !== 'object' || entry === null) continue
    if (entry._type !== 'block') continue
    if (typeof entry.style !== 'string' || !HEADING_STYLES.has(entry.style)) continue

    const text = blockText(entry)
    if (!text) continue

    headings.push({
      key: typeof entry._key === 'string' ? entry._key : '',
      style: entry.style,
      text,
      anchor: toSlug(text, ANCHOR_MAX_LENGTH),
    })
  }

  return headings
}

/** Two headings that cannot be told apart by a link, or one that cannot be
 *  linked to at all. Attach with `.warning()`. */
export const describeAnchorProblem = (value: unknown): true | ValidationError => {
  const headings = docHeadings(value)
  const seen = new Map<string, string>()

  for (const heading of headings) {
    if (!heading.anchor) {
      return {
        message:
          `The heading "${heading.text}" contains no letters or numbers a web ` +
          'address can carry, so nothing can link straight to this part of the page ' +
          'and it will be missing from the contents list down the side. Add a word or ' +
          'two in the Latin alphabet, or use a plain paragraph instead of a heading.',
        path: pathToItem(heading.key),
      }
    }

    const first = seen.get(heading.anchor)
    if (first !== undefined) {
      return {
        message:
          `"${first}" and "${heading.text}" both produce the link "#${heading.anchor}", ` +
          'so a link to one of them arrives at the other. The site will number them ' +
          'apart to keep the contents list working, but those numbers depend on the ' +
          'order of the page — reorder it later and every link people have already ' +
          'shared points somewhere new. Give the two headings different words ' +
          '("Example request" and "Example response", rather than "Example" twice) ' +
          'and this goes away.',
        path: pathToItem(heading.key),
      }
    }

    seen.set(heading.anchor, heading.text)
  }

  return true
}

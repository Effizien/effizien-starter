import { richTextHeadingLevel } from '@/lib/page-builder/heading-outline'

/** Portable Text → Markdown, for `llms-full.txt`.
 *
 * The sibling of `to-plain-text.ts`: that one throws away structure, this one
 * keeps the structure a reader needs and throws away the presentation.
 *
 * **Not a renderer, and must never become one.** Anything a browser displays
 * goes through `@portabletext/react`. If this file ever grows to cover the
 * page-builder blocks, it has become a second rendering of the site that will
 * drift from the first, and the two will disagree about what a page says —
 * which is the exact failure the SEO layer is built to avoid.
 *
 * ## Heading levels are derived, not stored
 *
 * `studio/schemaTypes/objects/rich-text.ts` offers "Heading" and "Subheading",
 * not `h2` and `h3`, and `page-builder/heading-outline.ts` explains why: a
 * stored level lets an editor reorder sections into an h1 → h3 jump. The same
 * function that decides levels for the rendered page decides them here, so a
 * change to that rule reaches both.
 *
 * In an article body the document title is the `h1`, so "Heading" is an `h2`.
 *
 * ## What is deliberately not handled
 *
 * **Internal links become plain text.** Resolving one needs the query to expand
 * `internalTarget->` and map its `_type` back through `ROUTE`. External links
 * carry their URL on the annotation and are emitted. This is a first draft of a
 * file with no confirmed consumer (D-007); wire internal links up when
 * something is demonstrably reading them.
 *
 * **Markdown special characters are not escaped.** A literal asterisk in body
 * copy will read as emphasis. Escaping every `*`, `_` and `#` makes the output
 * markedly harder for a human to read, and the consumer here is a language
 * model that handles the ambiguity better than a parser would.
 */

type Span = {
  readonly _type: string
  readonly text?: string | null
  readonly marks?: readonly string[] | null
}

type MarkDef = {
  readonly _key: string
  readonly _type: string
  readonly externalUrl?: string | null
}

type PortableBlock = {
  readonly _type: string
  readonly style?: string | null
  readonly listItem?: string | null
  readonly level?: number | null
  readonly children?: readonly Span[] | null
  readonly markDefs?: readonly MarkDef[] | null
  /** `mediaImage` members carry these. */
  readonly alt?: string | null
  readonly caption?: string | null
}

/** Decorators to their Markdown wrappers. Anything not listed — a decorator a
 *  client adds later — passes through as plain text rather than as a literal
 *  mark name, which is the failure mode worth avoiding. */
const DECORATOR: Record<string, string> = {
  strong: '**',
  em: '*',
  code: '`',
}

function serializeSpan(span: Span, markDefs: readonly MarkDef[]): string {
  let text = span.text ?? ''
  if (!text) return ''

  const marks = span.marks ?? []

  for (const mark of marks) {
    const wrapper = DECORATOR[mark]
    if (wrapper) text = `${wrapper}${text}${wrapper}`
  }

  /* Link last, so the wrapping reads `[**bold text**](url)` rather than
     `**[bold text](url)**` — both render, the first is conventional. */
  for (const mark of marks) {
    const definition = markDefs.find((def) => def._key === mark)
    if (definition?._type === 'link' && definition.externalUrl) {
      text = `[${text}](${definition.externalUrl})`
    }
  }

  return text
}

/** A serialised block, and whether it is part of a list.
 *
 * The flag exists because list items are the one block type that must *not* be
 * separated by a blank line — see `toMarkdown`. */
type Line = { readonly text: string; readonly isListItem: boolean }

function serializeBlock(block: PortableBlock): Line | null {
  /* An image contributes its description, which is real content — the alt text
     is what a sighted reader gets from the picture. The URL is omitted: a
     signed CDN link is noise in a document meant to be read. */
  if (block._type === 'mediaImage') {
    const description = block.alt ?? block.caption
    return description ? { text: `![${description}]`, isListItem: false } : null
  }

  if (block._type !== 'block') return null

  const text = (block.children ?? [])
    .filter((child) => child._type === 'span')
    .map((child) => serializeSpan(child, block.markDefs ?? []))
    .join('')

  if (!text.trim()) return null

  if (block.listItem) {
    /* `level` is 1-based and nests. Numbered lists use "1." throughout —
       Markdown renumbers, and a hand-incremented counter goes wrong the moment
       a nested list interrupts the sequence.

       Three spaces per level, not two. CommonMark nests a child item only when
       it is indented at least as far as the parent's content starts, and a
       numbered marker ("1. ") is three characters wide. Two spaces nests
       correctly under a bullet and silently becomes a *sibling* list under a
       number, which reorders the document's meaning rather than its looks. */
    const indent = '   '.repeat(Math.max(0, (block.level ?? 1) - 1))
    const bullet = block.listItem === 'number' ? '1.' : '-'
    return { text: `${indent}${bullet} ${text}`, isListItem: true }
  }

  if (block.style === 'blockquote') return { text: `> ${text}`, isListItem: false }

  /* Article body: the document title is the h1, so "Heading" is an h2. */
  const level = richTextHeadingLevel(block.style ?? undefined, 2)
  if (level) {
    return { text: `${'#'.repeat(level)} ${text}`, isListItem: false }
  }

  return { text, isListItem: false }
}

export function toMarkdown(value: readonly PortableBlock[] | null | undefined): string {
  if (!value) return ''

  const lines = value
    .map(serializeBlock)
    .filter((line): line is Line => line !== null && line.text.length > 0)

  /* A blank line separates blocks — that is what ends a paragraph in Markdown.
     Between two consecutive list items it does something else: it makes the
     list "loose", wrapping every item in its own paragraph. Portable Text has
     no concept of a loose list, so emitting one invents formatting the editor
     did not ask for, and it is the difference between a tight list of three
     points and three separated statements. */
  return lines
    .reduce((markdown, line, index) => {
      if (index === 0) return line.text
      const previous = lines[index - 1]
      const separator = line.isListItem && previous?.isListItem ? '\n' : '\n\n'
      return markdown + separator + line.text
    }, '')
    .trim()
}

/** Portable Text → a plain string.
 *
 * Structured data and `llms.txt` both need the *words* out of a rich text field
 * with none of the formatting. This is the smallest thing that does that job.
 *
 * It is deliberately not a renderer. Anything the page displays goes through
 * `@portabletext/react`, which handles marks, annotations and custom block
 * types properly. This function is for the places where a string is the only
 * thing that fits — a JSON-LD `answer`, a meta description, a summary line.
 *
 * **Non-block content is skipped, not stubbed.** An image inside a rich text
 * field contributes nothing to a plain-text rendering of it, and emitting
 * "[image]" would put that literal text into a search result.
 */

type Span = { readonly _type: string; readonly text?: string | null }

type Block = {
  readonly _type: string
  readonly children?: readonly Span[] | null
}

/** Blocks separated by `blockSeparator`, spans joined with nothing between.
 *
 * Spans within a block are runs of the same sentence split by formatting —
 * "the **fastest** route" is three spans — so joining them with a space would
 * insert one in the middle of a word. Blocks are separate paragraphs and do
 * need a separator; the default is a space rather than a newline because most
 * callers here want one line.
 */
export function toPlainText(
  value: readonly Block[] | null | undefined,
  blockSeparator = ' ',
): string {
  if (!value) return ''

  return value
    .filter((block) => block._type === 'block')
    .map((block) =>
      (block.children ?? [])
        .filter((child) => child._type === 'span')
        .map((child) => child.text ?? '')
        .join(''),
    )
    .filter((text) => text.length > 0)
    .join(blockSeparator)
    .trim()
}

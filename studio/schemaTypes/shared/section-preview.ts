/** Previews for page-builder sections.
 *
 *  A page is a collapsed list of rows. The editor scrolls it looking for the one
 *  they need to change, and a row that says "Features" tells them nothing on a
 *  page with three features sections. So every block in this library previews the
 *  same way:
 *
 *    title     the words the editor wrote — its heading, or failing that the
 *              first thing it actually says
 *    subtitle  what kind of section it is, plus how many items it holds
 *    media     the image, if the block has one; otherwise the block's icon
 *
 *  Getting this right matters more than any other single thing in a page builder:
 *  it is the difference between a page you can edit and a page you have to open
 *  every row of to understand. */

type PreviewSpan = { _type?: unknown; text?: unknown }
type PreviewBlock = { _type?: unknown; children?: unknown }

const flattenPortableText = (blocks: unknown[]): string =>
  blocks
    .filter((block): block is PreviewBlock => typeof block === 'object' && block !== null)
    .filter((block) => block._type === 'block')
    .map((block) =>
      (Array.isArray(block.children) ? block.children : [])
        .filter(
          (child): child is PreviewSpan => typeof child === 'object' && child !== null,
        )
        .filter((child) => child._type === 'span')
        .map((child) => (typeof child.text === 'string' ? child.text : ''))
        .join(''),
    )
    .join(' ')

/** One line of readable text from a string, a `text` field or rich text.
 *
 *  Rich text arrives as an array of blocks whose text lives several levels down,
 *  and images and other embedded objects are in the same array — hence the
 *  guards rather than a chain of optional accesses. */
export const previewText = (value: unknown, maxLength = 90): string => {
  const flat = Array.isArray(value)
    ? flattenPortableText(value)
    : typeof value === 'string'
      ? value
      : ''

  const collapsed = flat.replace(/\s+/g, ' ').trim()
  if (collapsed.length <= maxLength) return collapsed
  return `${collapsed.slice(0, maxLength).trimEnd()}…`
}

/** "3 questions", "1 question", "No questions yet".
 *
 *  The empty case is worth spelling out: an editor who added a section and never
 *  filled it in sees that from the collapsed row, instead of a row that looks
 *  finished. */
export const describeCount = (
  value: unknown,
  singular: string,
  plural: string,
): string => {
  const count = Array.isArray(value) ? value.length : 0
  if (count === 0) return `No ${plural} yet`
  return `${count} ${count === 1 ? singular : plural}`
}

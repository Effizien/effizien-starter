import { stegaClean } from 'next-sanity'

/** Strips click-to-edit metadata from the two fields Portable Text *dispatches*
 *  on, and from nothing else.
 *
 *  ## The bug this exists to prevent
 *
 *  `@portabletext/react` picks a component by matching `block.style` against the
 *  keys of the `components.block` map, and `block.listItem` against
 *  `components.listItem`. That match happens inside the library, before any code
 *  in this repository runs.
 *
 *  In draft mode `next-sanity` hides invisible characters inside the strings it
 *  returns. `style` and `listItem` are both encoded — verified against
 *  `@sanity/client`'s `filterDefault`, whose denylist covers `slug`, `url`,
 *  `href` and any key containing "type", and covers neither of these. So a
 *  heading arrives as `"heading"` plus invisible characters, matches no key, and
 *  falls through to the default paragraph renderer. Every heading in every rich
 *  text field silently becomes body copy — for the editor, in Presentation,
 *  which is exactly where they are judging whether the CMS works.
 *
 *  Cleaning inside the block component is too late; the dispatch has already
 *  happened. Cleaning the whole value with `stegaClean(value)` would work and
 *  would also strip the metadata out of the **text**, which is what draws the
 *  click-to-edit overlay — trading a real editing feature for a bug fix.
 *
 *  So this cleans the structure and leaves the content alone. Spans, marks and
 *  every visible string pass through untouched.
 *
 *  ## Why this is not in `heading-outline.ts`
 *
 *  `richTextHeadingLevel` there compares `style` too, and does not clean it.
 *  That is not a defect in the spec: its only consumer until now was
 *  `to-markdown.ts`, reached through `/llms-full.txt`, which fetches with the
 *  bare client and never sees stega at all. The renderer is the first consumer
 *  that does, so the cleaning belongs at the renderer's boundary rather than
 *  inside a spec shared with a consumer that cannot hit the problem.
 */

type StructuralBlock = {
  readonly _type?: string
  readonly style?: string | null
  readonly listItem?: string | null
}

export const cleanBlockStructure = <T extends StructuralBlock>(
  blocks: readonly T[] | null | undefined,
): T[] => {
  if (!Array.isArray(blocks)) return []

  return blocks.map((block) => {
    /* Only `block` members carry a style. An image in the middle of a rich text
       field is dispatched by `_type`, which begins with an underscore and is
       never encoded. */
    if (block?._type !== 'block') return block

    return {
      ...block,
      style: stegaClean(block.style),
      listItem: stegaClean(block.listItem),
    }
  })
}

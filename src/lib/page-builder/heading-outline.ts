import { stegaClean } from 'next-sanity'

/** Where every heading level on a page-builder page comes from.
 *
 *  The Studio half of this is `studio/schemaTypes/shared/heading-outline.ts`,
 *  which explains why no block stores its own level. This is the half that
 *  decides what the levels actually are. The two are deliberately duplicated
 *  rather than shared: `studio/` is a separate application with its own
 *  dependencies, and a shared package between them would be the first piece of
 *  monorepo machinery in a repository that does not have any. Keep them in step
 *  by hand — there are two functions, and the doc comments point at each other.
 *
 *  ## The rules
 *
 *  1. Exactly one `h1` per page. The first section supplies it if it declares a
 *     heading; otherwise the renderer emits the document title as the `h1` above
 *     the sections. Never both.
 *  2. Every other section heading is an `h2`.
 *  3. A heading inside a section is one level below that section's own heading —
 *     an `h3` normally. A section with no heading of its own has nothing for its
 *     contents to be a child of, so those headings take the section's place at
 *     `h2`.
 *
 *  Rule 3 is why this is computed rather than hardcoded. It shifts depending on
 *  whether the editor gave the section a heading, and the block cannot know.
 *
 *  ## Usage
 *
 *  ```tsx
 *  const outline = headingOutline(page.pageBuilder)
 *
 *  return (
 *    <main>
 *      {outline.documentTitleIsPageHeading && <h1>{page.title}</h1>}
 *      {page.pageBuilder?.map((section) => (
 *        <Section key={section._key} value={section} levels={outline.levels[section._key]} />
 *      ))}
 *    </main>
 *  )
 *  ```
 */

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

/** The two levels a section renders with. */
export type SectionHeadingLevels = {
  /** The section's own heading. `null` when it has none. */
  section: HeadingLevel | null
  /** Anything headed inside it: item names, rich-text headings. */
  child: HeadingLevel
}

export type HeadingOutline = {
  /** True when no section claimed the `h1`, so the renderer must emit one. */
  documentTitleIsPageHeading: boolean
  /** Keyed by the section's `_key`. */
  levels: Record<string, SectionHeadingLevels>
}

/** The minimum a section has to look like for levels to be worked out. Kept
 *  structural rather than importing the generated `PageBuilder` type, so
 *  regenerating `sanity.types.ts` cannot break this file. */
type LevelledSection = {
  _key: string
  heading?: string | null
}

/** Does this section announce itself?
 *
 *  In draft mode Sanity hides click-to-edit metadata inside every string it
 *  returns, which makes a *visually* empty heading non-empty as a string. Left
 *  unhandled, every heading looks present in a Presentation preview and nowhere
 *  else — a bug that appears only for the editor, which is the worst kind.
 *
 *  ## Corrected in WP12
 *
 *  This used to strip `U+E0000–U+E007F`, the Unicode Tags block, with a
 *  hand-rolled regex. **Sanity's encoder does not use that range.** It uses
 *  `@vercel/stega`, whose alphabet is the zero-width characters `U+200B`,
 *  `U+200C`, `U+200D` and `U+FEFF`, in runs of four or more. So the regex
 *  stripped nothing that was ever actually present, and a whitespace-only
 *  heading in Presentation was read as a real one: the section claimed the
 *  page's `h1`, rendered it empty, and `documentTitleIsPageHeading` went false —
 *  leaving the page with a blank `h1` and its real title rendered as ordinary
 *  text. Found by reading the encoder rather than by hitting it.
 *
 *  `stegaClean` is the encoder's own inverse, so it cannot drift from it the way
 *  a copied character range did.
 *
 *  `richTextHeadingLevel` below compares `style` and does *not* clean it. That is
 *  deliberate and not the same gap: its callers clean first because they must —
 *  `@portabletext/react` dispatches on `style` inside the library, so
 *  `src/lib/page-builder/rich-text.ts` has already stripped it by the time the
 *  level is worked out. This function is different: it reads section data
 *  straight off the query result, so it is the one that has to do its own
 *  cleaning. */
const declaresHeading = (section: LevelledSection): boolean =>
  typeof section.heading === 'string' && stegaClean(section.heading).trim().length > 0

const deeper = (level: HeadingLevel): HeadingLevel =>
  (level < 6 ? level + 1 : 6) as HeadingLevel

export const headingOutline = (
  sections: readonly LevelledSection[] | null | undefined,
): HeadingOutline => {
  const levels: Record<string, SectionHeadingLevels> = {}
  if (!Array.isArray(sections) || sections.length === 0) {
    return { documentTitleIsPageHeading: true, levels }
  }

  const first = sections[0]
  const firstDeclaresHeading = first !== undefined && declaresHeading(first)

  for (const [index, section] of sections.entries()) {
    const isPageHeading = index === 0 && firstDeclaresHeading
    const sectionLevel: HeadingLevel = isPageHeading ? 1 : 2

    levels[section._key] = declaresHeading(section)
      ? { section: sectionLevel, child: deeper(sectionLevel) }
      : { section: null, child: sectionLevel }
  }

  return { documentTitleIsPageHeading: !firstDeclaresHeading, levels }
}

/** `<Heading>` for a computed level. `h2` is the safe default for a section
 *  rendered outside a page builder — a related-articles strip in a footer, a
 *  block previewed on its own in Presentation. */
export const headingTag = (level: HeadingLevel | null | undefined) =>
  `h${level ?? 2}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

/** Rich-text styles are relative: "Heading" is one level below the section it is
 *  in, "Subheading" one below that. Pass the `child` level from the outline. */
export const richTextHeadingLevel = (
  style: string | undefined,
  childLevel: HeadingLevel,
): HeadingLevel | null => {
  if (style === 'heading') return childLevel
  if (style === 'subheading') return deeper(childLevel)
  return null
}

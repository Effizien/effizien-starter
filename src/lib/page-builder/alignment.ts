import { stegaClean } from 'next-sanity'

/** The alignment field, turned into classes.
 *
 *  Two things make this a function rather than a template literal in the
 *  component.
 *
 *  **Stega.** In draft mode `next-sanity` hides click-to-edit metadata inside
 *  every string it returns, including this one. The value looks like `'center'`
 *  and compares unequal to `'center'`, so a `switch` silently falls through to
 *  the default and alignment stops working — but only for the editor, only in
 *  Presentation, which is where they are looking when they decide whether the CMS
 *  works. Any Sanity value used for *logic* rather than display goes through
 *  `stegaClean` first.
 *
 *  **Tailwind.** Class names are found by scanning source text, so
 *  `text-${alignment}` produces no CSS at all. The full class strings have to
 *  appear literally somewhere, and here is somewhere.
 *
 *  The stored values are `start`/`center`, not `left`/`center`: logical
 *  properties, so a right-to-left locale is a CSS concern rather than a content
 *  migration. */
export type SectionAlignment = 'start' | 'center'

export const sectionAlignment = (value: string | null | undefined): SectionAlignment =>
  stegaClean(value) === 'center' ? 'center' : 'start'

export const sectionAlignmentClass = (value: string | null | undefined): string =>
  sectionAlignment(value) === 'center'
    ? 'text-center items-center'
    : 'text-start items-start'

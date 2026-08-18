import type { ReactNode } from 'react'

import { type HeadingLevel, headingTag } from '@/lib/page-builder/heading-outline'

/** A section's own heading, at whatever level the outline worked out.
 *
 *  Shared by every block rather than repeated in each, because the level is
 *  never a block's decision to make — it depends on where the section sits on
 *  the page, which the block cannot see. A block that reached for `<h2>`
 *  directly would be right until an editor dragged it to the top.
 *
 *  A null level means the section declared no heading. That is not an error and
 *  not a missing `h2`: `heading-outline.ts` rule 3 promotes the section's
 *  *contents* up a level to fill the gap, so rendering nothing here is what
 *  keeps the outline unbroken.
 */

type SectionHeadingProps = {
  readonly level: HeadingLevel | null
  readonly children: ReactNode
  readonly className?: string
}

export function SectionHeading({ level, children, className }: SectionHeadingProps) {
  if (level === null || !children) return null

  const Tag = headingTag(level)

  return <Tag className={className}>{children}</Tag>
}

import type { ReactNode } from 'react'

import type { SectionHeadingLevels } from '@/lib/page-builder/heading-outline'

/** The contract between the dispatcher and a block, in a module that imports
 *  neither.
 *
 *  This file exists to keep one rule enforceable: **the dispatcher must not
 *  import an archetype's modules.** Putting these two types in `page-builder.tsx`
 *  alongside the dispatcher would mean `archetype-blocks.tsx` had to import from
 *  the very file that imports it — a cycle, and the same shape of cycle that
 *  broke the archetype switch in WP4 with `Unknown type: post`.
 *
 *  With the contract living here, both sides import downwards and nothing
 *  imports back up. */

/** The minimum a section has to look like to be dispatched and levelled. */
export type SectionValue = {
  readonly _key: string
  readonly _type: string
  readonly heading?: string | null
}

/** How a block type turns a section into markup. The cast from `SectionValue`
 *  to the block's own shape happens in the registry entry, so each component
 *  still declares exactly what it needs. */
export type SectionRenderer = (
  section: SectionValue,
  levels: SectionHeadingLevels,
) => ReactNode

import {
  ArticleList,
  type ArticleListValue,
} from '@/components/page-builder/article-list'

import type { SectionRenderer } from './types'

/** The page-builder blocks the active archetype contributes.
 *
 *  ## Why this file exists rather than a few more lines in the dispatcher
 *
 *  `page-builder.tsx` must not import an archetype's modules. In the Studio that
 *  rule is load-bearing: `blocks/page-builder.ts` is part of the base model, the
 *  archetype bundles import the shared helpers sitting beside it, and importing
 *  back the other way is the cycle that made selecting the catalogue archetype
 *  fail with `Unknown type: post` — a one-line switch that did not actually
 *  work.
 *
 *  The same shape applies here. The dispatcher imports this module and the
 *  contract in `./types`; this module imports the blocks and the same contract.
 *  Everything points downwards, so no arrangement of archetypes can produce a
 *  cycle.
 *
 *  ## Changing archetype
 *
 *  `studio/archetype.ts` is the switch on the Studio side. **This map is its
 *  counterpart on the front end**, and both are edited at scaffold time:
 *
 *  - **marketing** — `articleList`, below.
 *  - **catalog** — `productList` and `enquiryForm`. Neither is written yet, and
 *    `productList` additionally needs `ROUTE.product`, which does not exist:
 *    the catalogue's addresses have to be defined in `src/lib/routes.ts` *and*
 *    `studio/presentation.ts` together, or `tests/routes-mirror.test.ts` fails.
 *    That is a catalogue site's work, not the marketing starter's.
 *  - **docs** — no page-builder blocks at all. `studio/archetype.ts` lists none,
 *    because documentation pages are `docPage` documents with their own body
 *    rather than composed sections.
 *
 *  A block named here whose component does not exist is a compile error, which
 *  is the right moment to find out. A section whose type is not in this map
 *  renders nothing — see the dispatcher.
 */
export const ARCHETYPE_BLOCKS: Record<string, SectionRenderer> = {
  articleList: (section, levels) => (
    <ArticleList value={section as ArticleListValue} levels={levels} />
  ),
}

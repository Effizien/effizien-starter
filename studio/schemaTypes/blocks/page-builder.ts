import { defineArrayMember, defineType } from 'sanity'

import { activePageBuilderBlocks } from '../../archetype'
import { describeSectionOrderProblem } from '../shared/heading-outline'

/** A page, as a list of sections.
 *
 *  One named type, used by every document that composes a page — `page`,
 *  `homePage`, and whatever a client's archetype adds. Naming it means a client
 *  site changes what can go on a page in one place, and means `pageBuilder` is a
 *  single generated TypeScript type on the front end rather than a structurally
 *  identical array declared four times.
 *
 *  ## Six blocks, and what it takes to add a seventh
 *
 *  Opening section, text, list of items, questions, quotes, call to action. They
 *  cover the marketing, catalogue and documentation archetypes between them
 *  because they are content shapes rather than layouts: a services grid, a
 *  category index and a table of contents are all "list of items", and the
 *  difference between them is the heading.
 *
 *  A page builder fails in one of two directions, and the second is much more
 *  common. Too few blocks and editors bend one into a shape it was not meant for
 *  — that shows up immediately and gets fixed. Too many and the insert menu
 *  becomes a catalogue nobody reads: the client picks whichever block they used
 *  last, three of the twenty are never used at all, and every one of them is a
 *  front-end component that has to keep working forever. Twenty blocks is not
 *  twenty times the flexibility, it is twenty times the surface.
 *
 *  So a new block needs an answer to: what content shape does this hold that the
 *  existing six cannot? "It looks different" is a component with a prop. "It has
 *  fields none of these have" is a new block. And if the answer is "it needs its
 *  own editing screen and gets reused across pages", it is a document type with a
 *  reference, not a block at all.
 *
 *  ## What is deliberately absent
 *
 *  - **A media block.** An image with a caption is a text section with an image
 *    in it. Same description requirement, same caption, and the editor can put
 *    words around it without asking for a new block first.
 *  - **A video block.** Video needs a hosting decision — an embed, or a provider
 *    with a plugin — and that is a per-client choice with a cost attached.
 *    Adding a half-answer now means every client inherits it.
 *  - **A list of other documents** ("latest articles", "related pages"). It is
 *    genuinely useful and it is the most likely seventh block, but it can only be
 *    designed once a site's document types exist: a curated reference list, an
 *    automatic query, or both, is a different schema in each case.
 *  - **Columns, spacers, and anything else that arranges rather than says.** They
 *    turn a content model into a page-layout tool with worse ergonomics than the
 *    one the client already knows, and they make every future redesign a content
 *    migration.
 *
 *  ## Ordering is meaning
 *
 *  The order of this array is the order a visitor reads the page and the order a
 *  screen reader announces it, and it is where the page's heading structure comes
 *  from — see `shared/heading-outline.ts`. The validation below is the one rule
 *  that cannot be derived: the section carrying the page's main heading has to be
 *  the first one, and there can only be one of it. */
export const pageBuilder = defineType({
  name: 'pageBuilder',
  title: 'Sections',
  type: 'array',
  of: [
    defineArrayMember({ type: 'hero' }),
    defineArrayMember({ type: 'textSection' }),
    defineArrayMember({ type: 'features' }),
    defineArrayMember({ type: 'faqs' }),
    defineArrayMember({ type: 'testimonials' }),
    defineArrayMember({ type: 'callToAction' }),
    /* Blocks contributed by the active archetype — `articleList` for marketing,
       `productList`/`enquiryForm` for catalogue, none for docs.

       Referenced by name rather than imported, because this file is part of the
       base model and importing an archetype module would be a cycle. The names
       are guaranteed to resolve: `studio/archetype.ts` drives both this list and
       the type registration in `schemaTypes/index.ts`, so a block is only listed
       here when its type is also registered. */
    ...activePageBuilderBlocks.map((type) => defineArrayMember({ type })),
  ],
  options: {
    insertMenu: {
      /* On by default past five types, but stated rather than inherited: a
         client whose archetype removes a block should not silently lose the
         search box at four. */
      filter: true,
      /* The icons are how a block is recognised in this menu and in the
         collapsed list of sections. Same icon in both places, on purpose. */
      showIcons: true,
    },
  },
  validation: (rule) => rule.custom(describeSectionOrderProblem),
})

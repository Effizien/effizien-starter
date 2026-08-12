import type { SchemaTypeDefinition } from 'sanity'

import { articleList } from '../blocks/article-list'
import { category } from '../documents/category'
import { person } from '../documents/person'
import { post } from '../documents/post'

/** The marketing archetype, as one import.
 *
 *  D-012 chooses an archetype at scaffold time, which only works if choosing one
 *  is an edit somebody can make in a minute and choosing the other is an edit
 *  they can undo. This file is what makes that true: everything the marketing
 *  archetype adds is imported here and nowhere else, so wiring it in and out is
 *  a fixed, short list rather than an archaeology exercise.
 *
 *  ## What this adds, and what it deliberately does not
 *
 *  Three document types and one block:
 *
 *    post         a dated, authored article — the only new page-shaped type
 *    person       the human on the byline
 *    category     the subject an article is filed under ("Topic" to editors)
 *    articleList  a page-builder section that shows articles
 *
 *  **There is no `service` and no `caseStudy`, on purpose.** They are the two
 *  types every marketing brief asks for, and on almost every marketing site they
 *  are pages. `documents/page.ts` sets the test — a specialised type exists when
 *  the content has fields a generic page does not — and neither clears it:
 *
 *    · A services page is a hero, a features list, some testimonials and a call
 *      to action. That is six blocks the page builder already has. Making
 *      `service` a document type does not add a field; it adds a route, a
 *      listing page, an ordering problem, and a second place the editor has to
 *      learn.
 *    · A case study is a narrative — the situation, what was done, what came of
 *      it. Narrative is prose, and prose in three fields called `challenge`,
 *      `approach` and `result` is a template, which is why every one written
 *      afterwards reads the same. As text sections it is a story; as fields it
 *      is a form.
 *
 *  The case for promoting either is real but specific, and it is always the same
 *  case: the content has to be *queried as a set* — a price and a duration on
 *  every service so they can be compared, an industry and a metric on every case
 *  study so they can be filtered. That is a catalogue, it is the catalog
 *  archetype's problem, and it deserves an ADR in `docs/decisions/` rather than
 *  a document type that appeared in a build. Until then, "make it a page" costs
 *  a client nothing and costs them nothing to reverse; "make it a type" is
 *  content migration in both directions.
 *
 *  `post` clears the same test on four fields at once — a date, an author, a
 *  subject, and a summary shown somewhere the article is not — which is why it
 *  is here and they are not.
 *
 *  ## Wiring it in
 *
 *  Two lines. Nothing else in the Studio changes, because the base already
 *  anticipates the blog: `document-types.ts` names `post`, `person` and
 *  `category`; `structure.ts` builds the Blog section from whichever of them the
 *  schema actually registers; `presentation.ts` already routes `/blog/:slug` and
 *  explains to the editor why a person and a topic have no preview; and
 *  `shared/linkable-types.ts` already lets an editor link to an article.
 *
 *    1. `schemaTypes/index.ts` — import and spread:
 *
 *         import {marketingSchemaTypes} from './archetypes/marketing'
 *         export const schemaTypes = [...baseSchemaTypes, ...pageBuilderSchemaTypes,
 *                                     ...marketingSchemaTypes]
 *
 *    2. `blocks/page-builder.ts` — one member in the `of` array:
 *
 *         defineArrayMember({type: 'articleList'}),
 *
 *       This is the only edit to a base file, and it is unavoidable: Sanity has
 *       no way to extend a registered array type's members from outside it.
 *       Put it last, so the insert menu's existing order does not move under an
 *       editor who has already learned it.
 *
 *  ## Wiring it out
 *
 *  Undo both, delete the four files — and then one more, which will otherwise be
 *  missed until the Studio white-screens: remove `{name: 'post', …}` from
 *  `shared/linkable-types.ts`. A `reference` pointing at a type the schema does
 *  not define is a Studio-level error, not a quiet no-op, and that file says so
 *  itself.
 *
 *  Everything else degrades on its own. `document-types.ts` keeps `post`,
 *  `person` and `category` as names nothing registers, which its own comment
 *  calls out as expected ("Not every entry exists in every clone").
 *  `structure.ts` guards every list item on `context.schema.has(...)` and simply
 *  builds no Blog section. `presentation.ts` keeps three `locations` entries
 *  nothing ever asks for. None of the three needs touching, and none of them
 *  breaks. */
export const marketingSchemaTypes: SchemaTypeDefinition[] = [
  /* Documents, in the order they matter to an editor rather than alphabetically:
     the thing they publish, the person on it, the shelf it goes on. */
  post,
  person,
  category,

  /* The one page-builder section this archetype adds. Registered here rather
     than in `blocks/index.ts` so that the block library stays the base library —
     it has no business knowing that articles exist. */
  articleList,
]

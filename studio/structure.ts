import { BookIcon } from '@sanity/icons/Book'
import type {
  DocumentListBuilder,
  ListBuilder,
  ListItemBuilder,
  StructureBuilder,
  StructureResolver,
  StructureResolverContext,
} from 'sanity/structure'

import {
  DOCUMENT_TYPE,
  SINGLETONS,
  type SingletonDefinition,
  singletonDocumentId,
} from './document-types'

/** Studio structure — the left-hand pane, and the only place singletons exist.
 *
 * The default structure (`S.defaults()`) is an alphabetical list of every
 * document type. That is a view of the *schema*, not a view of the *site*:
 * "Category · Home page · Navigation · Page · Person · Post · Redirect · Site
 * settings" tells a client nothing about where to go to change the thing they
 * opened the Studio to change. Alphabetical order is also unstable — adding one
 * document type reshuffles the menu the client has already learned.
 *
 * So: site-wide things first, then the content they publish, then the technical
 * bits, in an order that does not move when the schema grows.
 *
 * Every item is guarded on its type actually being registered, because clones
 * delete things — a docs site has no blog. Anything this file does *not* place
 * still appears, under a divider at the bottom: an unreachable document type is
 * a content model that silently loses content.
 */

/** Anything `S.list().items()` will take. */
type StructureItem = Parameters<ListBuilder['items']>[0][number]

const warnedAbout = new Set<string>()

/** A singleton listed in `document-types.ts` that the schema does not define is
 *  a wiring mistake, not a feature. It is invisible in the Studio, so say it out
 *  loud in the console rather than letting the client discover the gap. */
function warnMissingSingleton(type: string): void {
  if (warnedAbout.has(type)) return
  warnedAbout.add(type)
  console.warn(
    `[structure] Singleton "${type}" is listed in document-types.ts but is not a ` +
      `registered document type, so it has no place in the Studio. Either add it ` +
      `to schemaTypes/index.ts or remove it from SINGLETONS.`,
  )
}

/** Icons come from the schema type, never from a second list in this file.
 *  Two sources of truth for one icon means the sidebar and the "Create" menu
 *  eventually disagree about what a Page looks like. */
function iconFor(context: StructureResolverContext, type: string) {
  return context.schema.get(type)?.icon
}

/** The first of `candidates` that is really a field on `type`, or `undefined`.
 *
 * Used to choose a sort field. A `defaultOrdering` naming a field that does not
 * exist does not error — GROQ just returns documents in an arbitrary order — so
 * the list quietly stops being sorted and nobody finds out until the client says
 * "it used to be alphabetical". Asking the live schema means a clone that calls
 * the field `name` instead of `title` degrades to Sanity's own default ordering
 * rather than to nonsense.
 *
 * Underscore-prefixed candidates (`_createdAt`, `_updatedAt`) are system fields
 * present on every document and are not declared in `fields`, so they always
 * qualify — which is what makes them usable as a last-resort fallback. */
function fieldOn(
  context: StructureResolverContext,
  type: string,
  candidates: readonly string[],
): string | undefined {
  const schemaType = context.schema.get(type)
  if (!schemaType || !('fields' in schemaType)) return undefined
  return candidates.find(
    (candidate) =>
      candidate.startsWith('_') ||
      schemaType.fields.some((field) => field.name === candidate),
  )
}

/** Apply a default sort, or leave the list on Sanity's own default (most
 *  recently edited first) when there is no field to sort on. */
function sortedBy(
  list: DocumentListBuilder,
  field: string | undefined,
  direction: 'asc' | 'desc',
): DocumentListBuilder {
  return field ? list.defaultOrdering([{ field, direction }]) : list
}

/** A singleton list item: one document, fixed id, reached by name.
 *
 * `documentId()` is what makes this a singleton. Without it the editor gets a
 * brand-new draft every time they open the pane. This is the one case where an
 * explicit `_id` is the right call — ordinary content should let Sanity generate
 * ids and connect records with references. */
function singletonItem(
  S: StructureBuilder,
  context: StructureResolverContext,
  { type, title }: SingletonDefinition,
): ListItemBuilder {
  return S.listItem()
    .id(type)
    .title(title)
    .icon(iconFor(context, type))
    .child(
      S.document()
        .id(type)
        .schemaType(type)
        .documentId(singletonDocumentId(type))
        .title(title),
    )
}

export const structure: StructureResolver = (S, context) => {
  /** Types this file has placed somewhere. Populated as items are built rather
   *  than declared up front — a type whose section was skipped must fall through
   *  to the catch-all below, or it becomes unreachable. */
  const placed = new Set<string>()

  /** Build a list item only if the schema actually has the type. */
  const ifPresent = (
    type: string,
    build: () => ListItemBuilder,
  ): ListItemBuilder | null => {
    if (!context.schema.has(type)) return null
    placed.add(type)
    return build()
  }

  const isItem = (item: ListItemBuilder | null): item is ListItemBuilder => item !== null

  // ── Site-wide singletons ───────────────────────────────────────────────────
  // First, because they are the things that affect every page, and because a
  // fixed position at the top is the only position a client can learn.
  const singletons = SINGLETONS.map((singleton) => {
    if (!context.schema.has(singleton.type)) {
      warnMissingSingleton(singleton.type)
      return null
    }
    placed.add(singleton.type)
    return singletonItem(S, context, singleton)
  }).filter(isItem)

  // ── Published content ──────────────────────────────────────────────────────
  //
  // What an editor actually sees when one of these lists holds 200 documents:
  //
  //   · Sorted by title, not by "most recently edited". A phone book, not a
  //     haystack — they already know the name of the page they came for.
  //   · The sort menu at the top of the pane still offers every ordering the
  //     schema type declares in its `orderings`, so "recently updated" is one
  //     click away. That menu is generated from the schema; this file only
  //     chooses which of them opens by default.
  //   · The pane's search box searches the whole type. Past a couple of hundred
  //     documents search is the real navigation and sort order is the fallback,
  //     which is why no list here is pre-filtered into "views" — a filtered list
  //     hides documents from search results that an editor expects to find.
  //   · Each row's title, subtitle and thumbnail come from the schema type's
  //     `preview`. A page shows its own URL as the subtitle, which is the thing
  //     that tells two pages both called "Overview" apart.
  const pages = ifPresent(DOCUMENT_TYPE.page, () =>
    S.listItem()
      .id(DOCUMENT_TYPE.page)
      .title('Pages')
      .icon(iconFor(context, DOCUMENT_TYPE.page))
      .child(
        sortedBy(
          S.documentTypeList(DOCUMENT_TYPE.page).title('Pages'),
          fieldOn(context, DOCUMENT_TYPE.page, ['title']),
          'asc',
        ),
      ),
  )

  // Articles, the people who write them and the subjects they cover are one
  // job. Grouping them costs one click and saves the client from wondering why
  // "Person" sits between "Page" and "Post". Rename "Blog" to whatever the
  // client calls it — "News", "Insights", "Journal". The label is theirs.
  const blogItems = [
    ifPresent(DOCUMENT_TYPE.post, () =>
      S.listItem()
        .id(DOCUMENT_TYPE.post)
        .title('Articles')
        .icon(iconFor(context, DOCUMENT_TYPE.post))
        .child(
          sortedBy(
            S.documentTypeList(DOCUMENT_TYPE.post).title('Articles'),
            // Newest first: an article list is a timeline, and the one an editor
            // wants is nearly always the one they published last.
            fieldOn(context, DOCUMENT_TYPE.post, ['publishedAt', '_createdAt']),
            'desc',
          ),
        ),
    ),
    ifPresent(DOCUMENT_TYPE.person, () =>
      S.listItem()
        .id(DOCUMENT_TYPE.person)
        .title('Authors')
        .icon(iconFor(context, DOCUMENT_TYPE.person))
        .child(
          sortedBy(
            S.documentTypeList(DOCUMENT_TYPE.person).title('Authors'),
            fieldOn(context, DOCUMENT_TYPE.person, ['name', 'title']),
            'asc',
          ),
        ),
    ),
    ifPresent(DOCUMENT_TYPE.category, () =>
      S.listItem()
        .id(DOCUMENT_TYPE.category)
        .title('Topics')
        .icon(iconFor(context, DOCUMENT_TYPE.category))
        .child(
          sortedBy(
            S.documentTypeList(DOCUMENT_TYPE.category).title('Topics'),
            fieldOn(context, DOCUMENT_TYPE.category, ['title', 'name']),
            'asc',
          ),
        ),
    ),
  ].filter(isItem)

  const blog =
    blogItems.length > 0
      ? S.listItem()
          .id('blog')
          .title('Blog')
          .icon(BookIcon)
          .child(S.list().id('blog').title('Blog').items(blogItems))
      : null

  // ── Technical, but genuinely editorial ─────────────────────────────────────
  // Redirects belong to whoever changes a URL, and that is the editor. Hidden
  // from them, a rename quietly costs the client every inbound link to the page
  // — the most damaging and most preventable failure there is at launch.
  const redirects = ifPresent(DOCUMENT_TYPE.redirect, () =>
    S.listItem()
      .id(DOCUMENT_TYPE.redirect)
      .title('Redirects')
      .icon(iconFor(context, DOCUMENT_TYPE.redirect))
      .child(
        sortedBy(
          S.documentTypeList(DOCUMENT_TYPE.redirect).title('Redirects'),
          // Sorted by the old address, because the question an editor arrives
          // with is "is /old-page already handled?" and that is a scan down one
          // column rather than a search for a string they may be guessing at.
          fieldOn(context, DOCUMENT_TYPE.redirect, ['source']),
          'asc',
        ),
      ),
  )

  // ── Anything this file has not placed ──────────────────────────────────────
  // A safety net, not a section. It is empty in the starter and stays empty as
  // long as new document types are added to `document-types.ts` too. When it is
  // not empty, that is the signal to come back here and file the new type
  // properly rather than leaving it in the attic.
  const unplaced = S.documentTypeListItems().filter((item) => {
    const id = item.getId()
    return typeof id === 'string' && !placed.has(id)
  })

  const content = [pages, blog].filter(isItem)
  const items: StructureItem[] = [...singletons]

  if (content.length > 0) items.push(S.divider(), ...content)
  if (redirects) items.push(S.divider(), redirects)
  if (unplaced.length > 0) items.push(S.divider(), ...unplaced)

  return S.list().id('content').title('Content').items(items)
}

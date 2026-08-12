import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { defineArrayMember, defineField, defineType, getPublishedId } from 'sanity'

import { DOCUMENT_TYPE } from '../../document-types'
import { ROUTE } from '../../presentation'
import { seoField } from '../objects/seo'
import { LIMIT } from '../shared/editorial-guardrails'
import { DOCUMENT_FIELD_GROUPS, FIELD_GROUP } from '../shared/field-groups'
import { previewText } from '../shared/section-preview'
import { slugField } from '../shared/slug-field'
import { STUDIO_API_VERSION } from '../shared/validation'
import { DOCS_LIMIT } from './docs-limits'

/** One page of the manual.
 *
 *  ── The decision the whole archetype turns on ─────────────────────────────────
 *
 *  **A documentation page does not know where it sits.** There is no `parent`
 *  field, no `section` reference, no `order` number, and its web address is a
 *  single flat segment under `/docs/` no matter how deep in the sidebar it
 *  appears. Position and order live in exactly one place — the `docsNavigation`
 *  document — and moving a page there changes nothing about the page.
 *
 *  The obvious alternative is the one nearly every documentation CMS reaches for:
 *  a parent reference on each page, with the URL built from the chain of
 *  ancestors, so `/docs/guides/deployment/vercel` falls out of the hierarchy for
 *  free. It is rejected here for three reasons, in increasing order of how much
 *  they cost.
 *
 *  1. **Reordering becomes a numbers game.** Siblings under a parent have no
 *     inherent order, so the model needs an `order` integer or a rank string on
 *     every page. Either way an editor moving a page up the sidebar edits a
 *     number on two documents and hopes. Drag-and-drop is not available, because
 *     the thing being dragged is not in a list — it is scattered across a hundred
 *     documents that each hold one number.
 *
 *  2. **Restructuring the manual breaks every URL under the moved node.**
 *     Documentation gets reorganised constantly — it is the whole job. With the
 *     path derived from position, promoting one page out of one group rewrites
 *     the address of everything beneath it, and every bookmark, every link in a
 *     support ticket, every answer someone posted on a forum, points at a 404.
 *     For a marketing site that is an occasional event with a redirect attached.
 *     For documentation it is a weekly one, and no editor writes forty redirects.
 *
 *  3. **It makes the sidebar unreadable as data.** With hierarchy on the child,
 *     rendering the sidebar means fetching every page and rebuilding the tree in
 *     the frontend, and there is no document anywhere that answers "what is the
 *     shape of this manual?".
 *
 *  So the address is a property of the page, chosen once, and the shape of the
 *  manual is a property of the manual. Reorganising the sidebar is free.
 *  The one thing that *does* change an address is an editor changing this slug,
 *  and `slugField` catches that at the moment it happens — it names the old and
 *  the new address and asks for a Redirect, which is an ordinary document type
 *  the same editor can create. See `shared/slug-field.ts`.
 *
 *  The cost, stated plainly: addresses are flat, so `/docs/vercel` rather than
 *  `/docs/guides/deployment/vercel`. Slugs therefore have to be unique across the
 *  whole manual and read as unique — `deploying-to-vercel`, not `vercel`. That is
 *  a naming discipline rather than a structural one, the duplicate check enforces
 *  it with a message naming the page in the way, and it buys permanent URLs.
 *
 *  ── Cross-references ─────────────────────────────────────────────────────────
 *
 *  Every link between documentation pages is a Sanity `reference`, never a typed
 *  path: inline links in `body` go through the shared `link` object, and lateral
 *  ones go through `relatedPages` below. A reference is by document id, so it
 *  survives the target being renamed, moved in the sidebar, or given a new
 *  address — and Sanity refuses to delete a page something still links to, which
 *  means a broken cross-reference is reported to the person creating it rather
 *  than to a customer six weeks later. In a body of documentation this is not a
 *  nicety; hand-typed internal links are the single largest source of rot.
 *
 *  For this to work, `docPage` must be listed in `shared/linkable-types.ts`.
 *  That is one of the four lines the archetype adds outside its own directory.
 *
 *  ── The table of contents ────────────────────────────────────────────────────
 *
 *  Two different things get called one, and neither is stored:
 *
 *    · the **sidebar** — `docsNavigation`, one document, drag-ordered
 *    · the **"On this page" list** — derived from the headings in `body` at
 *      render time, with anchors slugified from the heading text
 *
 *  `doc-headings.ts` is the whole of the second, including why an `anchor` field
 *  per heading would be the hand-maintained version of the same mistake.
 *
 *  ── Versioning ───────────────────────────────────────────────────────────────
 *
 *  Not modelled, and that is a decision rather than an omission. Versioned
 *  documentation (v1 alongside v2) multiplies every page by the number of
 *  supported versions, needs a version per navigation tree, a switcher, canonical
 *  and `noindex` handling so old versions do not outrank current ones in search,
 *  and a rule for what happens to a cross-reference that points at a page which
 *  exists in v2 and not v1. That is a module, not a field, and most client
 *  documentation — a handbook, a help centre, a product manual — has exactly one
 *  version: the true one.
 *
 *  It stays addable without a migration because hierarchy is already a separate
 *  document: a versioned site adds a `version` field here and one
 *  `docsNavigation` per version, and existing content becomes the current
 *  version by defaulting an absent `version` to it. Nothing already written
 *  moves. Had the hierarchy lived on the page, versioning would have meant
 *  rewriting every parent pointer.
 *
 *  What documentation actually needs, and what versioning usually gets reached
 *  for as a proxy for, is an answer to *"is this page still true?"* — which is
 *  `lastReviewedAt` below, one field.
 *
 *  ── The GROQ contract (WP5) ──────────────────────────────────────────────────
 *
 *    *[_type == "docPage" && slug.current == $slug][0]{
 *      _id, title, summary, lastReviewedAt,
 *      body[]{
 *        ...,
 *        _type == "block" => {..., markDefs[]{..., _type == "link" => {...,
 *          internalTarget->{_type, "path": slug.current}}}},
 *        _type == "callout" => {..., content[]{...}}
 *      },
 *      relatedPages[]->{_id, title, summary, "path": slug.current},
 *      "seo": {
 *        "title":       coalesce(seo.title, title),
 *        "description": coalesce(seo.description, summary),
 *        "image":       seo.image,
 *        "noIndex":     seo.searchVisibility == "hidden",
 *        "canonicalUrl": seo.canonicalUrl
 *      }
 *    }
 *
 *  Three things the frontend owes this type:
 *
 *  · **Anchors derived with the same normalisation the Studio uses.** See the
 *    contract note at the end of `doc-headings.ts`. Getting this wrong breaks
 *    every deep link on the site at once, silently.
 *  · **`TechArticle` JSON-LD built from the page's own fields** — `headline` from
 *    `title`, `description` from `summary`, `dateModified` from `_updatedAt`.
 *    Derived from the content, never from the SEO overrides; `objects/seo.ts`
 *    explains why those two disagreeing is the one thing Google penalises here.
 *  · **`BreadcrumbList` built from `docsNavigation`, not from the URL.** The URL
 *    is flat by design, so the breadcrumb is the only place the reader is told
 *    which part of the manual they are in.
 *
 *  ── Localisation ─────────────────────────────────────────────────────────────
 *
 *  Document-level, when the module arrives: one `docPage` per locale, one
 *  `docsNavigation` per locale (it is a singleton, and `singletonDocumentId` in
 *  `studio/document-types.ts` already has the seam for that). No field here
 *  changes shape and no existing content moves. The one thing to revisit is
 *  written where it lives: slug uniqueness gains a `language ==` clause, and the
 *  `relatedPages` filter below gains the same, so a German page cannot recommend
 *  an English one. */

/** How the Studio describes a page's review state, in a list of two hundred.
 *
 *  Deliberately vague — "8 months ago", not a date. The question an editor is
 *  answering while scanning the list is "which of these have I not looked at in
 *  ages", and an exact date makes them do the arithmetic. */
function describeReviewState(value: unknown): string {
  if (typeof value !== 'string' || !value) return 'Never reviewed'

  const reviewed = new Date(value)
  if (Number.isNaN(reviewed.getTime())) return 'Never reviewed'

  const days = Math.floor((Date.now() - reviewed.getTime()) / 86_400_000)
  if (days < 0) return 'Review date is in the future'
  if (days < 31) return 'Reviewed this month'

  const months = Math.floor(days / 30.44)
  const age =
    months < 24 ? `${months} months ago` : `over ${Math.floor(days / 365.25)} years ago`

  return months >= DOCS_LIMIT.staleAfterMonths
    ? `Needs review — last checked ${age}`
    : `Reviewed ${age}`
}

export const docPage = defineType({
  name: 'docPage',
  title: 'Documentation page',
  type: 'document',
  icon: DocumentTextIcon,

  groups: DOCUMENT_FIELD_GROUPS,

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: FIELD_GROUP.content,
      description:
        'What this page is called — in the sidebar, in the browser tab, in search ' +
        'results and in every link to it from another page. Name the task rather ' +
        'than the feature: "Setting up a staging environment" is what someone ' +
        'searches for, "Staging" is not.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every page needs a title. Without one it appears as "Untitled" in the ' +
              'sidebar, in the browser tab and in search results.',
          ),
        rule
          .max(LIMIT.pageTitle)
          .warning(
            `Search results cut titles off around ${LIMIT.pageTitle} characters, and ` +
              'the sidebar is a narrow column — a long title wraps to three lines there ' +
              'and pushes its neighbours down. If the page needs the long version, set a ' +
              'shorter one under SEO & sharing.',
          ),
      ],
    }),

    /* The shared slug factory, pointed at the documentation route. It generates
       addresses that survive accented and German titles, refuses a duplicate in a
       message naming the page already using it, and — the reason it matters most
       here — warns when a *live* page's address changes and no Redirect covers
       the old one. That warning is the entire safety net for the only edit in
       this archetype that can break an external link. */
    slugField({
      source: 'title',
      pathFor: ROUTE.docPage,
      group: FIELD_GROUP.content,
    }),

    defineField({
      name: 'summary',
      title: 'One-line summary',
      type: 'text',
      rows: 2,
      group: FIELD_GROUP.content,
      description:
        'One sentence saying what a reader will be able to do after this page. It ' +
        'is shown under the title in the contents listing and under the link in ' +
        'search results, and it is what someone scanning ten similar-looking titles ' +
        'uses to pick one.',
      validation: (rule) => [
        rule
          .max(DOCS_LIMIT.summary)
          .warning(
            `Past about ${DOCS_LIMIT.summary} characters this is cut off in both places ` +
              'it appears. Say the one thing this page is for; the page itself is where ' +
              'the detail goes.',
          ),
        rule
          .custom((summary) => {
            if (typeof summary === 'string' && summary.trim().length > 0) return true
            return (
              'Write a one-line summary. Without it this page appears as a bare title ' +
              'in the contents listing, and Google writes its own description by ' +
              'grabbing the first sentence it finds — which on a documentation page is ' +
              'very often a warning or a code sample.'
            )
          })
          .warning(),
      ],
    }),

    defineField({
      name: 'body',
      title: 'Page content',
      type: 'docBody',
      group: FIELD_GROUP.content,
      description:
        'The page itself. Headings in here become the "On this page" list down the ' +
        'side — that list is built from them automatically, so there is nothing to ' +
        'keep in step. Two levels of heading is all there is on purpose: a page ' +
        'needing a third is two pages.',
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .error(
            'This page has nothing in it, so it publishes as a blank page at a real ' +
              'address — and search engines index it that way. Write something, or ' +
              'leave it as a draft until you have.',
          ),
    }),

    defineField({
      name: 'relatedPages',
      title: 'See also',
      type: 'array',
      group: FIELD_GROUP.content,
      description:
        'Other pages someone reading this one usually needs next. Shown at the ' +
        'bottom of the page. These are links to the pages themselves, so they follow ' +
        'if a page is renamed or its address changes — and they carry on working ' +
        'when the sidebar is reorganised.',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'docPage' }],
          options: {
            /* Creating a blank page from inside a reference field is how a
               dataset fills up with untitled orphan drafts nobody can account
               for. New pages are made from the Documentation list, where they can
               be added to the sidebar in the same sitting. */
            disableNew: true,
            /* A page cannot be related to itself, and a page with no address yet
               cannot be linked to at all. */
            filter: ({ document }) => {
              const self = getPublishedId(document._id)
              return {
                filter: '!(_id in $exclude) && defined(slug.current)',
                params: { exclude: [self, `drafts.${self}`] },
              }
            },
          },
        }),
      ],
      validation: (rule) => [
        rule
          .unique()
          .error(
            'The same page is listed twice. Remove one — a "See also" list with a ' +
              'repeat in it reads as a mistake and takes up a slot.',
          ),
        rule
          .max(DOCS_LIMIT.relatedPages)
          .warning(
            `Past ${DOCS_LIMIT.relatedPages} this stops being "what to read next" and ` +
              'becomes a second menu with no order to it. If this page really connects ' +
              'to everything, it probably wants to be higher up the sidebar instead.',
          ),
      ],
    }),

    defineField({
      name: 'lastReviewedAt',
      title: 'Last checked',
      type: 'date',
      group: FIELD_GROUP.content,
      description:
        'The day someone last read this page through and confirmed it is still ' +
        'true. Not the day it was last edited — fixing a typo is not checking a ' +
        'page. This is the only thing that tells you which parts of the manual have ' +
        'quietly gone out of date, so set it when you review, even if you changed ' +
        'nothing.',
      validation: (rule) =>
        rule.custom((value) => {
          if (typeof value !== 'string' || !value) return true
          const reviewed = new Date(value)
          if (Number.isNaN(reviewed.getTime())) return true
          if (reviewed.getTime() <= Date.now() + 86_400_000) return true
          return (
            'This date is in the future, so this page will report itself as freshly ' +
            'checked until then and never appear in the list of pages needing review. ' +
            'Use the day you actually read it through.'
          )
        }),
    }),

    seoField(),
  ],

  /* A page that exists but is in no sidebar group is reachable only by someone
     who already has the link. That is occasionally deliberate — an internal
     runbook, a page linked only from an error message — so it warns rather than
     blocks. Attached to the document rather than to a field because it is not any
     one field's fault, and because the fix is in a different document.

     Queried by type rather than by the singleton's fixed `_id`: while the
     navigation is being edited the change lives in `drafts.docsNavigation`, and
     an `_id ==` lookup would tell an editor who has *just* added the page that
     they have not. */
  validation: (rule) =>
    rule
      .custom(async (_document, context) => {
        const id = getPublishedId(context.document?._id ?? '')
        if (!id) return true

        const client = context.getClient({ apiVersion: STUDIO_API_VERSION })
        const listings = await client.fetch<number>(
          'count(*[_type == $navigationType && references($id)])',
          { navigationType: DOCUMENT_TYPE.docsNavigation, id },
        )
        if (listings > 0) return true

        return (
          'This page is not in the documentation menu, so nobody browsing the ' +
          'documentation will find it — only someone who already has the address. ' +
          'Open Documentation menu and drag it into the group it belongs in. If it is ' +
          'meant to be reachable only from a direct link, leave this as it is.'
        )
      })
      .warning(),

  orderings: [
    {
      name: 'leastRecentlyReviewed',
      title: 'Needs review first',
      by: [{ field: 'lastReviewedAt', direction: 'asc' }],
    },
    {
      name: 'recentlyUpdated',
      title: 'Recently updated',
      by: [{ field: '_updatedAt', direction: 'desc' }],
    },
    {
      name: 'titleAscending',
      title: 'Title, A–Z',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],

  preview: {
    select: {
      title: 'title',
      summary: 'summary',
      path: 'slug.current',
      lastReviewedAt: 'lastReviewedAt',
    },
    prepare({ title, summary, path, lastReviewedAt }) {
      return {
        title: previewText(title) || 'Untitled page',
        /* Address first, because two pages called "Overview" are told apart by
           nothing else; review state second, because that is the column an editor
           is scanning when they open this list on purpose. The summary is the
           fallback for a page that has no address yet, where the address would
           have been the useful half. */
        subtitle: path
          ? `${ROUTE.docPage(path)} · ${describeReviewState(lastReviewedAt)}`
          : `No web address yet — cannot be published${
              summary ? ` · ${previewText(summary, 50)}` : ''
            }`,
        media: DocumentTextIcon,
      }
    },
  },
})

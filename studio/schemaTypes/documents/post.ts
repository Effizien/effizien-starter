import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { DOCUMENT_TYPE } from '../../document-types'
import { ROUTE } from '../../presentation'
import { seoField } from '../objects/seo'
import { LIMIT } from '../shared/editorial-guardrails'
import { DOCUMENT_FIELD_GROUPS, FIELD_GROUP } from '../shared/field-groups'
import { SEO_LIMITS } from '../shared/seo-limits'
import { slugField } from '../shared/slug-field'

/** A dated, authored article. The marketing archetype's one new page-shaped type.
 *
 *  ## Why this is not a `page`
 *
 *  `page.ts` sets the test: a specialised document type exists when the content
 *  has fields a generic page does not, and otherwise it is a page with a
 *  `pageType` dropdown, which is presentation smuggled in as data. An article
 *  clears that bar on four fields at once — it is *dated*, it is *by someone*,
 *  it is *filed under a subject*, and it is *summarised on a card somewhere
 *  else*. None of those are true of an about page, and all four are load-bearing:
 *  the date orders the blog, the author is the `author` of the Article JSON-LD,
 *  the topics are how a reader finds the next one, and the summary is what the
 *  index and the search result both show.
 *
 *  ## Why it has a `body` and not a `pageBuilder`
 *
 *  Deliberate, and the page-builder rules say it outright: a page builder is for
 *  flexible layouts, and *not* for rigid, formulaic content — blog posts are the
 *  named example. An article is one piece of prose. Handing an editor six section
 *  types to write a 700-word article with produces articles assembled out of
 *  hero blocks, which read badly, index badly, and cannot be excerpted.
 *
 *  `richText` still carries images, links, quotes and two heading levels, so
 *  nothing an article actually needs is missing. If a client genuinely wants a
 *  long-form piece with sections, that piece is a `page`.
 *
 *  ## Heading levels
 *
 *  Nothing here stores one, for the reasons in `shared/heading-outline.ts`. The
 *  renderer emits the article title as the page's single `h1`; "Heading" inside
 *  `body` is one level below it, "Subheading" one below that. There is no hero
 *  in an article to compete for the `h1`, which is the other reason `body` beats
 *  a page builder here.
 *
 *  ## The GROQ contract (WP5)
 *
 *  Field names here are not free choices — three of them are named by contracts
 *  written elsewhere in this schema, and renaming any of them silently breaks
 *  the fallback rather than failing loudly:
 *
 *    excerpt     `coalesce(seo.description, excerpt)`  — see `objects/seo.ts`
 *    mainImage   `coalesce(seo.image, mainImage)`      — see `objects/seo.ts`
 *    publishedAt sorted on by `structure.ts`, and the field every article list
 *                orders by
 *
 *  Two more the frontend owes:
 *
 *    • **Article lists filter `publishedAt <= now()`.** A future date is how an
 *      editor schedules a piece — the validation below tells them so, and that
 *      promise is only true if the query keeps it. The single-article route does
 *      *not* filter: a preview link to a scheduled article has to work.
 *    • **JSON-LD comes from the content, never from `seo`.** `Article` with
 *      `headline: title`, `datePublished: publishedAt`, `dateModified:
 *      _updatedAt`, `author: author->{name, role}` and `image: mainImage`. An
 *      SEO override describes how the page is *presented* in a result; structured
 *      data describes what the page *is*, and feeding one from the other is how
 *      they end up contradicting each other.
 *
 *  ## When the i18n module is added
 *
 *  Document-level localisation (`@sanity/document-internationalization`), same as
 *  `page`: a hidden `language` field, one document per locale, no field here
 *  changes type and no existing article moves. Two things to revisit, both noted
 *  where they live — slug uniqueness scoped by language
 *  (`shared/editorial-guardrails.ts`), and whether `author` and `topics` should
 *  point at the locale's copy of a person or at one shared record.
 */

/** An ISO date as the editor would read it, in the editor's own locale.
 *
 *  Deliberately not pinned to a locale: this string is only ever shown inside the
 *  Studio, to whoever is logged in, and a German editor reading "Mar 3" is a
 *  small daily irritation with no upside. Returns `null` rather than the string
 *  "Invalid Date", which is what `toLocaleDateString` produces for a half-typed
 *  value and which looks like a bug in the list. */
function formatDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** More than this and the article is filed under everything, which is the same
 *  as being filed under nothing. A warning, not a rule — see the policy in
 *  `shared/editorial-guardrails.ts`. */
const MAX_TOPICS = 4

export const post = defineType({
  /* Own name as a literal would drift from `document-types.ts`, which is what
     `structure.ts` and `presentation.ts` both read. One source. */
  name: DOCUMENT_TYPE.post,
  title: 'Article',
  type: 'document',
  icon: DocumentTextIcon,

  groups: DOCUMENT_FIELD_GROUPS,

  fields: [
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      group: FIELD_GROUP.content,
      description:
        'What the article is called. It is the heading at the top of the article, the ' +
        'headline on its card in the blog, the first line of its entry in search ' +
        'results, and the label on every bookmark of it.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every article needs a headline. Without one it appears as "Untitled" in ' +
              'the blog, in search results and in this list.',
          ),
        rule
          .max(LIMIT.pageTitle)
          .warning(
            `Search results cut headlines off around ${LIMIT.pageTitle} characters. A ` +
              'longer one still works — it just ends in an ellipsis where it matters ' +
              'most. If the article needs the long version, set a shorter one under ' +
              'SEO & sharing.',
          ),
      ],
    }),

    /* `ROUTE.post` rather than a hand-written `/blog/${slug}`: the same function
       the Presentation tool builds preview links from. That is what makes the
       duplicate-address message and the missing-redirect warning name the address
       the site really serves, instead of one that was true when this was
       written. */
    slugField({ pathFor: ROUTE.post, group: FIELD_GROUP.content }),

    defineField({
      name: 'publishedAt',
      title: 'Publication date',
      type: 'datetime',
      group: FIELD_GROUP.content,
      /* Set to now on creation, because "today" is the right answer for almost
         every article and an unset date is the one mistake here that publishes
         successfully and then puts the piece at the bottom of the blog. Safe as
         an initial value in a way it would not be on a nested optional object —
         an article is only ever created deliberately. */
      initialValue: () => new Date().toISOString(),
      options: { dateFormat: 'D MMMM YYYY', timeFormat: 'HH:mm' },
      description:
        'The date this article is published under. It orders the blog, it is the date ' +
        'shown on the article, and it is what search engines treat as the date the ' +
        'piece was written. Setting it in the future schedules the article.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'This article has no date, so it has no place in the blog — the list is ' +
              'ordered by date, and an article without one sorts to the bottom or ' +
              'vanishes from it. Today’s date is almost always the right answer.',
          ),
        rule
          .custom((value) => {
            if (typeof value !== 'string') return true
            const date = new Date(value)
            if (Number.isNaN(date.getTime())) return true
            if (date.getTime() <= Date.now()) return true

            return (
              'This date is in the future, so the article stays out of the blog until ' +
              'then even after you publish it. That is how you schedule a piece — if ' +
              'you meant it to appear now, set the date to today.'
            )
          })
          .warning(),
      ],
    }),

    defineField({
      name: 'author',
      title: 'Author',
      type: 'reference',
      to: [{ type: DOCUMENT_TYPE.person }],
      group: FIELD_GROUP.content,
      /* Inline creation stays on, unlike the link picker in `objects/link.ts`.
         The risk there was orphan drafts: a half-made page nobody can account
         for. A person is one required field, it is created once and then reused
         forever, and the alternative is telling an editor mid-article to go and
         find another part of the Studio. */
      description:
        'Who wrote it. Shown on the article and used by search engines to work out ' +
        'who stands behind the writing, which is one of the few things they weigh ' +
        'that a site can actually control. If articles are unsigned, make one Person ' +
        'for the company and use it every time.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Choose an author. An unattributed article is treated as anonymous by ' +
              'search engines, and the byline is the part of a blog readers use to ' +
              'decide whether to trust it. Pick an existing person, or create one here.',
          ),
    }),

    defineField({
      name: 'topics',
      title: 'Topics',
      type: 'array',
      group: FIELD_GROUP.content,
      /* Named for what an editor calls it, pointing at the type
         `document-types.ts` calls `category`. The Studio label wins over schema
         symmetry: nobody outside this repository ever types the word "category". */
      of: [
        defineArrayMember({ type: 'reference', to: [{ type: DOCUMENT_TYPE.category }] }),
      ],
      description:
        'Optional. What this article is about, chosen from a shared list so the same ' +
        'subject is always spelled the same way. Topics are how a reader who liked ' +
        'this one finds the next one.',
      validation: (rule) => [
        rule
          .unique()
          .error(
            'This topic is already on the list. Remove the duplicate — the article ' +
              'would otherwise appear twice in the same topic.',
          ),
        rule
          .max(MAX_TOPICS)
          .warning(
            `Past ${MAX_TOPICS} topics, an article is filed under everything, which ` +
              'sorts it usefully under nothing. Pick the ones a reader would actually ' +
              'have gone looking for.',
          ),
      ],
    }),

    defineField({
      name: 'excerpt',
      title: 'Summary',
      type: 'text',
      rows: 3,
      group: FIELD_GROUP.content,
      description:
        'One or two sentences, written to someone deciding whether to read the ' +
        'article. This is the text on its card in the blog, the grey line under the ' +
        'headline in Google, and the preview when the link is shared. Not the first ' +
        'paragraph pasted in — a summary says what the reader will get.',
      validation: (rule) => [
        rule
          .required()
          .error(
            'Every article needs a summary. Without one, its card in the blog is a ' +
              'headline with a blank space under it, and Google writes its own sentence ' +
              'from whatever the article happens to open with.',
          ),
        rule
          .min(SEO_LIMITS.description.min)
          .warning(
            `Under ${SEO_LIMITS.description.min} characters Google tends to discard ` +
              'this and pick its own sentence out of the article instead — which is the ' +
              'thing writing a summary was meant to prevent.',
          ),
        rule
          .max(SEO_LIMITS.description.ideal)
          .warning(
            `Past roughly ${SEO_LIMITS.description.ideal} characters the end is cut ` +
              'off in search results, sooner on a phone. Nothing is lost by being long ' +
              '— just put what matters in the first sentence.',
          ),
        rule
          .max(SEO_LIMITS.description.hard)
          .error(
            'This is a paragraph rather than a summary. Nothing past the first line or ' +
              'two is ever shown, and a summary this long almost always means the ' +
              'opening of the article has been pasted into the wrong box.',
          ),
      ],
    }),

    defineField({
      name: 'mainImage',
      title: 'Main image',
      type: 'mediaImage',
      group: FIELD_GROUP.content,
      description:
        'Optional. Shown at the top of the article, on its card in the blog, and as ' +
        'the picture when the link is shared — unless a different sharing image is ' +
        'set under SEO & sharing. Landscape works best; the card crops to a wide ' +
        'shape, so set the hotspot on the part that has to survive.',
    }),

    defineField({
      name: 'body',
      title: 'Article',
      type: 'richText',
      group: FIELD_GROUP.content,
      description:
        'The article itself. Use Heading to break it into parts — people scanning ' +
        'read the headings first, and it is the only way someone using a screen ' +
        'reader can move around a long piece.',
      validation: (rule) =>
        rule
          .required()
          .min(1)
          .error(
            'This article has no text, so it would publish as an empty page at a real ' +
              'address — and search engines would index it that way. Write the article, ' +
              'or leave this as a draft until you have.',
          ),
    }),

    seoField(),
  ],

  /* The blog is a timeline, so the list opens newest first — `structure.ts` sets
     that as the default ordering. These are the alternatives in the sort menu at
     the top of the pane. "Oldest first" is the one people are surprised to need:
     it is how you find the pieces written years ago that nobody has looked at
     since, which is most of what a content audit is. */
  orderings: [
    {
      name: 'publishedAtDescending',
      title: 'Newest first',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
    {
      name: 'publishedAtAscending',
      title: 'Oldest first',
      by: [{ field: 'publishedAt', direction: 'asc' }],
    },
    {
      name: 'titleAscending',
      title: 'Headline, A–Z',
      by: [{ field: 'title', direction: 'asc' }],
    },
  ],

  preview: {
    select: {
      title: 'title',
      author: 'author.name',
      publishedAt: 'publishedAt',
      path: 'slug.current',
      media: 'mainImage',
    },
    prepare({ title, author, publishedAt, path, media }) {
      const date = formatDate(publishedAt)
      const scheduled =
        typeof publishedAt === 'string' && new Date(publishedAt).getTime() > Date.now()

      /* Three states an editor needs to tell apart at a glance in a list of two
         hundred rows: publishable, not yet publishable, and published-but-dated-
         ahead. The last one is the support ticket this line prevents — "I
         published it and it is not on the site". */
      const subtitle = !path
        ? 'No web address yet — cannot be published'
        : [
            date ? (scheduled ? `Scheduled for ${date}` : date) : 'No date',
            typeof author === 'string' && author ? author : 'No author',
          ].join(' · ')

      return {
        title: typeof title === 'string' && title ? title : 'Untitled article',
        subtitle,
        media: media ?? DocumentTextIcon,
      }
    },
  },
})

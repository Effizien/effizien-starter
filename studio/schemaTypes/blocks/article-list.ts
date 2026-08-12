import { DocumentsIcon } from '@sanity/icons/Documents'
import { defineArrayMember, defineField, defineType } from 'sanity'

import { DOCUMENT_TYPE } from '../../document-types'
import { sectionFields } from '../shared/section-fields'
import { SECTION_LIMIT } from '../shared/section-limits'
import { describeCount } from '../shared/section-preview'

/** A list of articles, on any page that composes itself from sections.
 *
 *  ## Why the archetype has to add a block at all
 *
 *  `blocks/page-builder.ts` names this as the most likely seventh block and says
 *  why it is not in the base library: "a list of other documents … can only be
 *  designed once a site's document types exist". The marketing archetype is the
 *  thing that makes `post` exist, so this is where that block belongs.
 *
 *  It is also load-bearing rather than decorative. `studio/presentation.ts`
 *  settles the blog index as "an ordinary `page` with the slug 'blog'", which
 *  means the index is content an editor owns — an intro, then the articles. If
 *  the list of articles were hardcoded into a Next.js route instead, the blog
 *  index would be the one page on the site whose main content does not exist in
 *  the CMS, and the editor would have no way to see that it was there.
 *
 *  ## Two sources, one block
 *
 *  The insert menu already carries six entries, and "Latest articles" and
 *  "Featured articles" as separate blocks would be two rows describing one
 *  content shape whose difference is a single answer. Schema rules §4D: a radio
 *  plus conditionally hidden fields, so exactly one set of inputs is on screen
 *  and there is no state where both are filled in and something has to decide
 *  which wins.
 *
 *    automatic — the blog index, and "latest from the blog" on a home page. It
 *                stays right on its own; nobody has to remember to come back
 *                here after publishing.
 *    chosen    — a curated row on a landing page, where the point is that these
 *                three specific pieces are the argument being made.
 *
 *  ## What is deliberately not here
 *
 *  - **No layout, columns or card style.** The page builder does not arrange, it
 *    says. See `blocks/page-builder.ts`.
 *  - **No heading level.** Derived by the renderer from where this section sits;
 *    `shared/heading-outline.ts` has the whole argument.
 *  - **No "exclude the current article".** A related-articles strip at the foot
 *    of a post is a frontend feature of the article template, not a section an
 *    editor drops onto a page. It never needs configuring, so it should never be
 *    a block.
 *  - **No pagination setting.** How the blog index pages beyond the first twelve
 *    is a route decision with a URL attached, not a content one.
 *
 *  ## The GROQ contract (WP5)
 *
 *  The two branches are two queries, chosen on `source`:
 *
 *    "latest"   *[_type == "post" && publishedAt <= now()
 *                 && (!defined($topic) || references($topic))]
 *                 | order(publishedAt desc)[0...$limit]
 *    "selected" articles[]->  — in the editor's order, unsorted
 *
 *  `publishedAt <= now()` is not optional. The Studio tells editors that a
 *  future date schedules an article; that is only true if this query honours it.
 *
 *  Project only what a card renders — `_id, title, slug, excerpt, mainImage,
 *  publishedAt, author->{name}` — never the whole document. A blog index that
 *  pulls twelve full article bodies to render twelve summaries is the classic
 *  quiet Core Web Vitals regression. */
export const articleList = defineType({
  name: 'articleList',
  title: 'Articles',
  type: 'object',
  icon: DocumentsIcon,

  fields: [
    /* Heading and introduction, shared with every other section that can
       announce itself. Both optional: on the blog index the page title has
       already said "Blog", and a heading reading "Articles" above a list of
       articles is a heading that exists to satisfy a rule. */
    ...sectionFields,

    defineField({
      name: 'source',
      title: 'Which articles?',
      type: 'string',
      options: {
        list: [
          {
            title: 'The most recent, kept up to date automatically',
            value: 'latest',
          },
          { title: 'Ones I choose, in the order I choose', value: 'selected' },
        ],
        layout: 'radio',
      },
      /* Safe as an initial value in a way it would not be on an optional nested
         object: this block only exists because someone inserted it from the
         section menu. Compare `objects/link.ts`, where an initial value would
         bring every untouched link field on the document into existence. */
      initialValue: 'latest',
      description:
        'Automatic is right almost everywhere — it means the list is still correct in ' +
        'two years without anyone editing this page. Choose the articles yourself only ' +
        'when which ones appear is the point.',
      validation: (rule) =>
        rule
          .required()
          .error(
            'Choose whether this list keeps itself up to date or holds articles you ' +
              'pick, then fill in the field that appears.',
          ),
    }),

    defineField({
      name: 'topic',
      title: 'Only articles about',
      type: 'reference',
      to: [{ type: DOCUMENT_TYPE.category }],
      hidden: ({ parent }) =>
        (parent as { source?: string } | undefined)?.source !== 'latest',
      description:
        'Optional. Leave empty for the most recent articles about anything. Set a topic ' +
        'and the list narrows to that subject — which is how a services page carries ' +
        'the articles relevant to it.',
    }),

    defineField({
      name: 'limit',
      title: 'How many to show',
      type: 'number',
      hidden: ({ parent }) =>
        (parent as { source?: string } | undefined)?.source !== 'latest',
      initialValue: 3,
      description:
        'The most recent this many. On a home page three or four is a taste of the ' +
        'blog; on the blog index itself this is the length of the first page.',
      validation: (rule) => [
        rule
          .integer()
          .min(1)
          .max(SECTION_LIMIT.listItemsMax)
          .error(
            `A whole number between 1 and ${SECTION_LIMIT.listItemsMax}. Past that, a ` +
              'list of articles is a page of its own — put a link to the blog under it ' +
              'instead.',
          ),
        rule.custom((value, context) => {
          const parent = context.parent as { source?: string } | undefined
          if (parent?.source !== 'latest') return true
          if (typeof value === 'number') return true
          return 'Say how many articles to show. With this empty the section renders nothing at all, which looks on the page exactly like a section that failed to load.'
        }),
      ],
    }),

    defineField({
      name: 'articles',
      title: 'Articles',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: DOCUMENT_TYPE.post }] })],
      hidden: ({ parent }) =>
        (parent as { source?: string } | undefined)?.source !== 'selected',
      description:
        'The articles to show, in this order. Drag to reorder. Remember to come back ' +
        'here when you publish something that should be in this list — nothing updates ' +
        'it for you.',
      validation: (rule) => [
        rule
          .unique()
          .error(
            'This article is already in the list, so it would appear twice in the same ' +
              'row. Remove the duplicate.',
          ),
        rule
          .max(SECTION_LIMIT.listItemsMax)
          .warning(
            `Past ${SECTION_LIMIT.listItemsMax} hand-picked articles, this is the blog ` +
              'index with extra maintenance. Switch to the automatic list.',
          ),
        rule.custom((value, context) => {
          const parent = context.parent as { source?: string } | undefined
          if (parent?.source !== 'selected') return true
          if (Array.isArray(value) && value.length > 0) return true
          return 'Choose at least one article, or switch this section back to the most recent ones. An empty list renders as a heading with nothing under it.'
        }),
      ],
    }),

    defineField({
      name: 'action',
      title: 'Link to more',
      type: 'action',
      description:
        'Optional, and usually pointing at the blog — "Read all articles". A handful of ' +
        'articles on a home page with no way through to the rest is a dead end. Leave ' +
        'it empty on the blog index itself, where there is nowhere further to go.',
    }),
  ],

  preview: {
    select: {
      heading: 'heading',
      source: 'source',
      limit: 'limit',
      articles: 'articles',
      /* `_ref` rather than `topic.title`: reference expansion inside a preview
         for an array member is not something to depend on, and a subtitle that
         silently reads "undefined" is worse than one that says less. */
      topic: 'topic._ref',
    },
    prepare({ heading, source, limit, articles, topic }) {
      const chosen = describeCount(articles, 'chosen article', 'chosen articles')
      const automatic =
        typeof limit === 'number'
          ? `${limit} most recent`
          : 'Most recent — how many is not set'

      return {
        title: typeof heading === 'string' && heading ? heading : 'Articles',
        subtitle:
          source === 'selected' ? chosen : topic ? `${automatic}, one topic` : automatic,
        media: DocumentsIcon,
      }
    },
  },
})

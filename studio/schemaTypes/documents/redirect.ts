import { LinkIcon } from '@sanity/icons/Link'
import { defineField, defineType } from 'sanity'

import { DOCUMENT_TYPE } from '../../document-types'
import { isAbsoluteHttpsUrl, isSitePath, looksAbsolute } from '../shared/site-path'
import { isValueUniqueAcrossDocuments, STUDIO_API_VERSION } from '../shared/validation'

/** One old address, and what should happen to it now.
 *
 * `AGENTS.md`: "Every old URL maps to a new one or a deliberate 410." That
 * sentence is why this is a document type an editor can reach rather than a
 * config file only a developer can change. The person who renames a page is the
 * person who needs to write the redirect, and they are not the person with a
 * terminal open. `slugField` in `shared/slug-field.ts` warns them the moment a
 * live address changes, and this is where that warning sends them.
 *
 * ── Why three outcomes and not `permanent: boolean` ───────────────────────────
 *
 * The obvious model is a boolean — 301 or 302. It cannot express the third case
 * the constraint above names: a page that is deliberately gone, where the honest
 * answer is a 410 rather than bouncing the visitor to a homepage that does not
 * answer their question. A soft-404 like that keeps the dead URL in Google's
 * index for months; a 410 removes it in days. The boolean WP5 wants is derived
 * in the query, so nothing downstream pays for the richer model.
 *
 * This is also the `options.list` over `boolean` rule from the Sanity schema
 * guide, arrived at from the content rather than from the guide: the states were
 * always three, and a boolean only ever described two of them.
 *
 * ── What WP5 does with this ───────────────────────────────────────────────────
 *
 *   *[_type == "redirect" && defined(source)]{
 *     source,
 *     destination,
 *     outcome,
 *     "permanent": outcome == "permanent"
 *   }
 *
 * The `permanent` and `temporary` rows go to `next.config.ts`:
 *
 *   async redirects() {
 *     return rows
 *       .filter((row) => row.outcome !== 'gone')
 *       .map(({source, destination, permanent}) => ({source, destination, permanent}))
 *   }
 *
 * `gone` cannot be expressed in `next.config.ts` at all — it only emits 3xx — so
 * those rows are served from middleware as a 410. Two consumers, one query.
 * Always filter on `outcome` before reading `destination`: switching a rule to
 * "gone" hides the field but does not erase what was typed in it.
 *
 * Two limits worth knowing before a migration: Vercel caps `next.config.ts` at
 * 1,024 redirects, and that config is read at build time. A redirect published
 * after a deploy does not take effect until the next one — which is exactly what
 * `studio/presentation.ts` tells the editor, so if WP5 moves this to middleware
 * for immediate effect, both strings change together.
 *
 * ── No `isEnabled` field ──────────────────────────────────────────────────────
 *
 * Sanity's own SEO guide suggests one. It duplicates something the CMS already
 * has: an unpublished redirect is not in the published dataset and therefore not
 * in the query. A second on/off switch beside publish/unpublish is a state
 * machine with four combinations, two of which mean nothing, and it is the kind
 * of field a client toggles and then cannot work out why nothing happened.
 *
 * ── Localisation ──────────────────────────────────────────────────────────────
 *
 * A locale-prefixed path is still just a path — `/de/ueber-uns` needs no new
 * field. If a client later wants redirects scoped to a locale, adding a `locale`
 * field then is purely additive: absent means "every locale", which is already
 * what every existing row means.
 */

const OUTCOME = {
  permanent: 'permanent',
  temporary: 'temporary',
  gone: 'gone',
} as const

type RedirectDocument = { source?: string; destination?: string; outcome?: string }

export const redirect = defineType({
  name: DOCUMENT_TYPE.redirect,
  title: 'Redirect',
  type: 'document',
  icon: LinkIcon,

  fields: [
    defineField({
      name: 'source',
      title: 'Old address',
      type: 'string',
      description:
        'The address that no longer works — only the part after your domain name. For ' +
        'https://example.com/about-us, enter /about-us. Copy it exactly as it was, ' +
        'including any .html or capital letters.',
      validation: (rule) => [
        /* `.custom()` is a separate rule rather than chained onto `.required()`:
           a message set with `.error(...)` overrides whatever a custom validator
           returns, so chaining them would replace every path message from
           `isSitePath` with "Without an old address…". */
        rule
          .required()
          .error('Without an old address there is nothing for this rule to catch.'),

        rule.custom(isSitePath),

        rule.custom(async (value, context) => {
          if (!value) return true

          const unique = await isValueUniqueAcrossDocuments(
            value,
            { fieldPath: 'source', types: [DOCUMENT_TYPE.redirect] },
            context,
          )

          return (
            unique ||
            `There is already a redirect for ${value}. Two rules for one address is ` +
              'ambiguous — the site would follow whichever it happened to read first. ' +
              'Edit the existing one instead of adding a second.'
          )
        }),
      ],
    }),

    defineField({
      name: 'outcome',
      title: 'What should happen',
      type: 'string',
      initialValue: OUTCOME.permanent,
      options: {
        layout: 'radio',
        list: [
          {
            title: 'Moved for good — send visitors to the new address',
            value: OUTCOME.permanent,
          },
          {
            title: 'Moved for now — the old address will be used again later',
            value: OUTCOME.temporary,
          },
          {
            title: 'Gone for good — the page is deleted and is not coming back',
            value: OUTCOME.gone,
          },
        ],
      },
      description:
        '"Moved for good" is almost always right: it passes the old page\'s standing in ' +
        'search results on to the new one, which "moved for now" deliberately does not. ' +
        'Choose "gone for good" when there is no replacement — it gets the dead address ' +
        'out of Google in days rather than months, where sending people to the homepage ' +
        'instead leaves it there.',
      validation: (rule) => rule.required(),
    }),

    defineField({
      name: 'destination',
      title: 'New address',
      type: 'string',
      hidden: ({ parent }) =>
        (parent as RedirectDocument | undefined)?.outcome === OUTCOME.gone,
      description:
        'Where visitors should end up: /our-services for a page on this site, or a ' +
        'complete https:// address to send them somewhere else entirely. Point at the ' +
        'closest equivalent page rather than the homepage — a visitor dropped on the ' +
        'homepage has to start their search over, and Google reads it as a dead end.',
      validation: (rule) => [
        // Shape, emptiness and the self-loop. All three mean the rule cannot
        // work at all, so all three block publishing.
        rule.custom((value, context) => {
          const document = context.document as RedirectDocument | undefined
          if (document?.outcome === OUTCOME.gone) return true

          if (!value) {
            return 'Say where visitors should end up, or change "What should happen" to "gone for good".'
          }

          if (value === document?.source) {
            return (
              'The new address is the same as the old one, which sends the visitor back ' +
              'to where they already are — the browser gives up with "too many ' +
              'redirects" and the page becomes unreachable.'
            )
          }

          return looksAbsolute(value) ? isAbsoluteHttpsUrl(value) : isSitePath(value)
        }),

        // A two-step loop: this points at B, and B points back here. Same
        // outcome as the self-loop, so also blocking.
        rule.custom(async (value, context) => {
          const document = context.document as RedirectDocument | undefined
          if (!value || !document?.source || document.outcome === OUTCOME.gone)
            return true

          const client = context.getClient({ apiVersion: STUDIO_API_VERSION })
          const onwards = await client.fetch<string | null>(
            '*[_type == $type && source == $source][0].destination',
            { type: DOCUMENT_TYPE.redirect, source: value },
          )

          if (onwards !== document.source) return true

          return (
            `${value} already redirects back to ${document.source}, so this makes a ` +
            'loop. A visitor would be sent between the two addresses until their browser ' +
            'gives up. Delete one of the two rules.'
          )
        }),

        // A chain. It works, it just works worse. Advisory.
        rule
          .custom(async (value, context) => {
            const document = context.document as RedirectDocument | undefined
            if (!value || document?.outcome === OUTCOME.gone) return true

            const client = context.getClient({ apiVersion: STUDIO_API_VERSION })
            const onwards = await client.fetch<string | null>(
              '*[_type == $type && source == $source][0].destination',
              { type: DOCUMENT_TYPE.redirect, source: value },
            )

            if (!onwards || onwards === document?.source) return true

            return (
              `${value} is itself redirected, on to ${onwards}. Visitors are bounced ` +
              "twice and a little of the old page's standing in search is lost at each " +
              `hop. Point this straight at ${onwards} instead.`
            )
          })
          .warning(),
      ],
    }),
  ],

  /* Ordered so the list reads as a redirect map: newest first is useless here,
     alphabetical by old address is how anyone checks whether a rule exists. */
  orderings: [
    {
      name: 'sourceAsc',
      title: 'Old address',
      by: [{ field: 'source', direction: 'asc' }],
    },
  ],

  preview: {
    select: { source: 'source', destination: 'destination', outcome: 'outcome' },
    prepare({ source, destination, outcome }) {
      const target = typeof destination === 'string' ? destination : 'nowhere yet'
      const subtitle =
        outcome === OUTCOME.gone
          ? 'Gone for good — returns 410'
          : outcome === OUTCOME.temporary
            ? `→ ${target} · temporary (302)`
            : `→ ${target} · permanent (301)`

      return {
        title: typeof source === 'string' ? source : 'No old address yet',
        subtitle,
        media: LinkIcon,
      }
    },
  },
})

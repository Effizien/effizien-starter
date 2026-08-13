import { SearchIcon } from '@sanity/icons/Search'
import { defineField, defineType } from 'sanity'

import { FIELD_GROUP } from '../shared/field-groups'
import { shareImageDimensionWarning } from '../shared/image-dimensions'
import { SEO_LIMITS } from '../shared/seo-limits'
import { hasText } from '../shared/validation'

/** SEO and social sharing — one object, on every document that has a URL.
 *
 * ── What this is not ──────────────────────────────────────────────────────────
 *
 * **Not a place to retype the page.** Every field here is an *override*: leave
 * it empty and the query falls back to content the page already has. An editor
 * made to type the title twice will eventually type it differently twice, and
 * the version Google shows will be the stale one.
 *
 * **Not a keywords box.** `<meta name="keywords">` has been ignored by Google
 * since 2009. Modelling it teaches a client to spend their time on something
 * that does nothing, and makes the CMS look like it was built in 2011.
 *
 * **Not per-network.** One title and one description — not an Open Graph set and
 * a Twitter set and a search set. Three fields saying the same thing get filled
 * in once and then diverge forever. WP5 maps this one set onto all three.
 *
 * **Not a page title with the site name in it.** The " — Acme Roofing" suffix is
 * a template applied once in the root layout (`title.template` in Next.js
 * metadata, fed from `siteSettings`). Typing it per page is how half a site ends
 * up with it and half without.
 *
 * ── The GROQ contract (WP5) ───────────────────────────────────────────────────
 *
 * Fallbacks belong in the query, not the component. A component doing
 * `seo.title ?? page.title` has to be repeated on every route and drifts on the
 * one nobody remembers. Every route projects the same shape, so
 * `generateMetadata` is identical everywhere:
 *
 *   *[_type == "page" && slug.current == $slug][0]{
 *     ...,
 *     "seo": {
 *       "title":        coalesce(seo.title, title),
 *       "description":  coalesce(seo.description, excerpt),
 *       "image":        coalesce(seo.image, mainImage),
 *       "imageAlt":     coalesce(seo.image.alt, mainImage.alt, title),
 *       "noIndex":      seo.searchVisibility == "hidden",
 *       "canonicalUrl": seo.canonicalUrl
 *     }
 *   }
 *
 * Note `searchVisibility == "hidden"` rather than `!= "visible"`. A document
 * saved before this field existed has no value at all, and "no value" has to
 * mean indexable — the alternative is a schema change that quietly deindexes a
 * live site. The projection is named `noIndex` because that is what Next.js and
 * every SEO tool call it; only the stored value differs.
 *
 * The sitemap follows the same rule:
 *
 *   *[_type in ["page","post"] && defined(slug.current)
 *     && seo.searchVisibility != "hidden"]{ "href": ..., _updatedAt }
 *
 * Three things WP5 must not get wrong:
 *   • Fetch metadata with `stega: false`. Stega characters are invisible on the
 *     page but real inside `<title>`, and they are copied into every search
 *     result and share card.
 *   • Canonical URLs are absolute (`AGENTS.md`). When `canonicalUrl` is empty
 *     the route builds its own from the site URL and the path. It is never
 *     omitted, and never relative.
 *   • JSON-LD is derived from the *content*, not from this object — `Article`
 *     from the post's own title, author and dates. This object describes how the
 *     page is presented in a result; structured data describes what the page is.
 *     Feeding JSON-LD from an SEO override is how the two end up disagreeing,
 *     which is the one thing Google penalises here.
 *
 * ── Localisation ──────────────────────────────────────────────────────────────
 *
 * Nothing here assumes one language, and nothing here needs changing to add one.
 * Pages and posts localise at the *document* level, which gives each locale its
 * own document carrying its own `seo` object. Field-level localisation would
 * mean changing `string` to `internationalizedArrayString` — a type change, and
 * therefore a migration of every document already written. That is the trade
 * being avoided by leaving this alone. hreflang alternates are derived from
 * translation metadata at query time; they are not content and do not belong in
 * this object.
 */

type ImageValue = { asset?: { _ref?: string } } | undefined

export const seo = defineType({
  name: 'seo',
  title: 'SEO & sharing',
  type: 'object',
  icon: SearchIcon,

  fieldsets: [
    {
      name: 'advanced',
      title: 'Advanced',
      description:
        'Both of these can remove this page from Google. Leave them alone unless you ' +
        'know you need them.',
      options: { collapsible: true, collapsed: true },
    },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Search result title',
      type: 'string',
      description:
        'The headline Google and social networks show. Leave it empty and the page ' +
        'title is used — fill it in only when the two should differ, for instance a ' +
        'page titled "Pricing" that should read "Roofing prices and quotes" in search.',
      validation: (rule) => [
        rule
          .max(SEO_LIMITS.title.ideal)
          .warning(
            `Around ${SEO_LIMITS.title.ideal} characters is where Google starts cutting ` +
              'the headline off with an ellipsis. Longer is not penalised — the end of ' +
              'it just stops being read.',
          ),
        rule
          .max(SEO_LIMITS.title.hard)
          .error(
            `Over ${SEO_LIMITS.title.hard} characters this is a sentence, not a title. ` +
              'If what you have written is the page summary, it belongs in the search ' +
              'result description below.',
          ),
      ],
    }),

    defineField({
      name: 'description',
      title: 'Search result description',
      type: 'text',
      rows: 3,
      description:
        'The grey text under the headline in Google, and the preview text when this ' +
        'page is shared. Write a sentence to a person deciding whether to click, not a ' +
        'list of keywords. Leave it empty and the page summary is used.',
      validation: (rule) => [
        rule
          .min(SEO_LIMITS.description.min)
          .warning(
            `Under ${SEO_LIMITS.description.min} characters Google tends to ignore this ` +
              'and pick its own sentence out of the page instead — which is the thing ' +
              'writing a description was meant to prevent.',
          ),
        rule
          .max(SEO_LIMITS.description.ideal)
          .warning(
            `Past roughly ${SEO_LIMITS.description.ideal} characters the end is cut off, ` +
              'sooner on a phone. Nothing is lost by being long, but put what matters in ' +
              'the first sentence.',
          ),
        rule
          .max(SEO_LIMITS.description.hard)
          .error(
            'This is a paragraph rather than a description. Nothing past the first line ' +
              'or two is ever shown, and a description this long almost always means ' +
              'page content has been pasted into the wrong box.',
          ),
      ],
    }),

    defineField({
      name: 'image',
      title: 'Sharing image',
      type: 'image',
      options: { hotspot: true },
      description:
        `Shown when this page is posted to LinkedIn, Facebook, X, WhatsApp or Slack. ` +
        `${SEO_LIMITS.openGraphImage.width}×${SEO_LIMITS.openGraphImage.height} or ` +
        'larger, PNG or JPEG — some networks still fail to render WebP. Set the hotspot ' +
        "so the crop keeps the important part. Leave it empty and the page's main image " +
        'is used.',
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description:
            'Describe what the image shows, for people using a screen reader and for ' +
            'anyone whose connection drops the image.',
          validation: (rule) =>
            rule.custom((alt, context) => {
              // No image, nothing to describe. This has to be checked rather
              // than using `required()`, or an editor who never touches the
              // sharing image cannot publish.
              if (!(context.parent as ImageValue)?.asset?._ref) return true
              if (hasText(alt)) return true

              return (
                'Describe this image. A sharing image is never decorative — for someone ' +
                'reading a shared post with a screen reader it is the entire visual ' +
                'content of the card, and this site is built to WCAG 2.2 AA.'
              )
            }),
        }),
      ],
      /* Shared with `siteSettings.socialImage`, which needs the identical check
         — see `shared/image-dimensions.ts`. A warning, never an error: the
         image renders, it just renders badly, and the editor may not have a
         larger version. */
      validation: (rule) => rule.custom(shareImageDimensionWarning()).warning(),
    }),

    defineField({
      name: 'searchVisibility',
      title: 'Search engines',
      type: 'string',
      fieldset: 'advanced',
      initialValue: 'visible',
      options: {
        layout: 'radio',
        list: [
          { title: 'Visible — this page can appear in search results', value: 'visible' },
          { title: 'Hidden — ask search engines to leave it out', value: 'hidden' },
        ],
      },
      description:
        'Hidden takes this page out of Google and out of the site map. Use it for ' +
        'thank-you pages, campaign landing pages, and anything only meant to be reached ' +
        'from a link you sent someone. It does not make the page private — anyone with ' +
        'the address can still open it.',
    }),

    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      fieldset: 'advanced',
      description:
        'Only for a page that deliberately republishes something already published ' +
        'elsewhere. It tells search engines "the original is over there, credit that ' +
        'one instead". Every page already declares itself the original, so leaving this ' +
        'empty is almost always right.',
      validation: (rule) =>
        rule
          .uri({ scheme: ['https'], allowRelative: false })
          .error(
            'Enter the complete address, starting with https:// and including the ' +
              'domain. A partial address here is either ignored or read as a different ' +
              'site, and pointing at the wrong page removes this one from search results ' +
              'entirely.',
          ),
    }),
  ],
})

/** The field every document type with a URL adds.
 *
 * A helper rather than four lines copied seven times: it puts the object in the
 * same group under the same label on every document, which is what makes the
 * Studio learnable. A document type that does not use field groups can write
 * `defineField({name: 'seo', type: 'seo'})` instead.
 */
export function seoField() {
  return defineField({
    name: 'seo',
    title: 'SEO & sharing',
    type: 'seo',
    group: FIELD_GROUP.seo,
    /* The one sentence that stops an editor filling this tab in because it is
       there. Every field inside is an override, so the honest instruction is
       "you do not need this" — and it belongs on the tab, not buried in each
       field. It lived on `page` alone until the WP4 review; saying it once here
       is what makes it true on every document type. */
    description:
      'Optional. Anything left blank falls back to the title above and the defaults in ' +
      'Site settings, so this is fully indexable and shareable without touching this tab.',
  })
}

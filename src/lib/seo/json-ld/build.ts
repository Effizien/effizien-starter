import type { SanityImageSource } from '@sanity/image-url'

import { toPlainText } from '@/lib/portable-text/to-plain-text'
import { urlFor } from '@/sanity/lib/image'

import { absoluteUrl, siteUrl } from '../site-url'
import type {
  Article,
  BreadcrumbList,
  FAQPage,
  ImageObject,
  ListItem,
  Organization,
  Product,
  Question,
  WithContext,
} from './schema-org'

/** Builders for the structured data this site emits.
 *
 * ## The rule that governs every function here
 *
 * **JSON-LD is derived from the content, never from the `seo` object.** WP4's
 * contract is explicit and it is the one thing Google actually penalises in
 * this area: the `seo` object says how a page is *presented* in a result;
 * structured data says what the page *is*. An `Article` takes its `headline`
 * from the post's own `title`, not from `seo.title` — otherwise an editor
 * writing a punchier search headline silently makes the two disagree.
 *
 * The second rule, same reasoning: **never emit structured data for content the
 * page does not display.** Google's guidelines require the markup to match
 * visible content, and marking up an FAQ nobody can read on the page is a
 * manual-action risk rather than a clever shortcut. This is why `buildFaqPage`
 * exists but is not yet wired to a route — see the note on it.
 *
 * ## Structural inputs, not generated types
 *
 * Every builder takes a plain shape rather than a type from `sanity.types.ts`.
 * The archetype switch is why: on a `marketing` site the `product` type is not
 * registered, so there is no generated `Product` type, and a builder importing
 * one would fail to compile on the very archetype that is active. Structural
 * inputs let all five compile everywhere and cost nothing.
 */

/** An image as either projection shape.
 *
 * A query that leaves the asset as a reference gives `_ref`; one that expands it
 * with `asset->` to reach `metadata.lqip` gives `_id` instead. Both are the same
 * asset and `urlFor` accepts either, but this builder used to test `_ref` alone —
 * so the first query to expand an image for the renderer would have dropped that
 * image from the structured data, with nothing failing and nothing to see. WP12
 * chunk 4 expands `mainImage` for exactly that reason. */
type ImageInput = {
  readonly asset?: { readonly _ref?: string; readonly _id?: string } | null
  readonly hotspot?: unknown
  readonly crop?: unknown
} | null

/** Sanity image → `ImageObject`, at a known size.
 *
 * The dimensions are asserted rather than measured because we just asked the
 * CDN for exactly this size. Google's documentation prefers `ImageObject` with
 * dimensions over a bare URL string. */
function imageObject(
  image: ImageInput | undefined,
  width: number,
  height: number,
): ImageObject | undefined {
  if (!image?.asset?._ref && !image?.asset?._id) return undefined

  return {
    '@type': 'ImageObject',
    url: urlFor(image as SanityImageSource)
      .width(width)
      .height(height)
      .fit('crop')
      .auto('format')
      .url(),
    width,
    height,
  }
}

/** The site's Organization entity, and the `@id` everything else points at.
 *
 * A fragment on the site root rather than a bare URL: `@id` must be globally
 * unique and stable, and the home page's own URL already identifies the *page*.
 * Using the same string for the page and the organisation is how two different
 * things end up merged into one entity. */
export const ORGANIZATION_ID = `${siteUrl}/#organization`

type SiteSettingsInput = {
  readonly siteName?: string | null
  readonly description?: string | null
  readonly logo?: ImageInput
  readonly socialImage?: ImageInput
  readonly contactEmail?: string | null
  readonly contactPhone?: string | null
  readonly postalAddress?: string | null
  readonly socialLinks?: readonly { readonly url?: string | null }[] | null
}

export function buildOrganization(
  site: SiteSettingsInput | null | undefined,
): WithContext<Organization> | null {
  /* No name, no entity. An Organization without one is not a weaker claim about
     the business, it is an unusable node that a consumer has to discard. */
  if (!site?.siteName) return null

  const sameAs = (site.socialLinks ?? [])
    .map((link) => link?.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0)

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: site.siteName,
    url: siteUrl,
    description: site.description ?? undefined,
    /* A logo is usually not 1.91:1, so it is requested square-ish and large
       rather than cropped to the share-card shape. Google's guidance is a
       minimum of 112×112. */
    logo: imageObject(site.logo, 512, 512),
    image: imageObject(site.socialImage, 1200, 630),
    email: site.contactEmail ?? undefined,
    telephone: site.contactPhone ?? undefined,
    /* The whole address goes in `streetAddress` because the field is free text
       — "one line per line, as it would go on an envelope". Splitting that into
       locality, region, postcode and country is guesswork that gets Berlin and
       Bern wrong, and a wrong structured address is worse than an unparsed one.
       A client who needs precise location data needs structured address fields
       in the schema, which is a content-model decision and not one to invent
       here. */
    address: site.postalAddress
      ? { '@type': 'PostalAddress', streetAddress: site.postalAddress }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  }
}

type ArticleInput = {
  readonly title?: string | null
  readonly excerpt?: string | null
  readonly publishedAt?: string | null
  readonly _updatedAt?: string | null
  readonly mainImage?: ImageInput
  readonly author?: {
    readonly name?: string | null
    readonly role?: string | null
  } | null
  readonly topics?: readonly { readonly title?: string | null }[] | null
}

/** An article, from the article — not from its SEO overrides.
 *
 * `path` is the site-relative address, always from `ROUTE`. */
export function buildArticle(
  post: ArticleInput | null | undefined,
  path: string,
): WithContext<Article> | null {
  if (!post?.title) return null

  const url = absoluteUrl(path)
  const author = post.author?.name

  const about = (post.topics ?? [])
    .map((topic) => topic?.title)
    .filter((title): title is string => typeof title === 'string' && title.length > 0)

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    /* `title`, not `seo.title`. See the rule at the top of this file. */
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: imageObject(post.mainImage, 1200, 675),
    datePublished: post.publishedAt ?? undefined,
    /* `_updatedAt` is Sanity's own timestamp, so it cannot drift from reality
       the way an editor-maintained "last reviewed" field does. */
    dateModified: post._updatedAt ?? undefined,
    author: author
      ? { '@type': 'Person', name: author, jobTitle: post.author?.role ?? undefined }
      : undefined,
    publisher: { '@id': ORGANIZATION_ID },
    mainEntityOfPage: url,
    about: about.length > 0 ? about : undefined,
  }
}

type ProductInput = {
  readonly title?: string | null
  readonly summary?: string | null
  readonly articleNumber?: string | null
  readonly images?: readonly ImageInput[] | null
  readonly category?: { readonly title?: string | null } | null
}

/** A catalogue product.
 *
 * ⚠️ **Unexercised on this archetype.** `ARCHETYPE` is `marketing`, so the
 * `product` type is not registered and nothing calls this. It is written now
 * because the catalogue archetype exists in the schema and a builder written
 * later, under deadline, is the one that gets the rule at the top of this file
 * wrong. Verify it against real documents the first time a catalogue site is
 * built.
 *
 * **No `offers`, deliberately.** The catalogue is B2B with no checkout, so
 * there is no price and no availability to state. Be honest with clients about
 * what that means: Google's product rich result *requires* `offers` with a
 * price, so this markup will not produce one. It still describes the product to
 * anything reading the page as data, which is the reason to emit it. */
export function buildProduct(
  product: ProductInput | null | undefined,
  path: string,
  brandName?: string | null,
): WithContext<Product> | null {
  if (!product?.title) return null

  const images = (product.images ?? [])
    .map((image) => imageObject(image, 1200, 1200))
    .filter((image): image is ImageObject => image !== undefined)

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${absoluteUrl(path)}#product`,
    name: product.title,
    description: product.summary ?? undefined,
    image: images.length > 0 ? images : undefined,
    mpn: product.articleNumber ?? undefined,
    category: product.category?.title ?? undefined,
    brand: brandName ? { '@type': 'Brand', name: brandName } : undefined,
  }
}

/** One step in a breadcrumb trail. `href` is site-relative, or omitted for the
 *  page the visitor is already on. */
export type Crumb = { readonly name: string; readonly href?: string }

/** The trail, from `ROUTE`.
 *
 * The caller passes the trail explicitly rather than this function deriving it
 * from a path, because a URL segment is not a title — `/why-flat-roofs-fail` is
 * not "Why flat roofs fail", and prettifying a slug back into a heading
 * produces exactly the wrong capitalisation on every proper noun. The route
 * knows the real titles; it should say them.
 *
 * A single-item trail returns null. "Home" on its own describes no path and
 * only adds bytes. */
export function buildBreadcrumbList(
  crumbs: readonly Crumb[],
): WithContext<BreadcrumbList> | null {
  if (crumbs.length < 2) return null

  const itemListElement: ListItem[] = crumbs.map((crumb, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: crumb.name,
    /* The final crumb carries no `item`. Google's documentation is explicit
       that the current page should be listed without a URL. */
    item: crumb.href ? absoluteUrl(crumb.href) : undefined,
  }))

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  }
}

type FaqInput = {
  readonly question?: string | null
  readonly answer?:
    | readonly {
        readonly _type: string
        readonly children?:
          | readonly { readonly _type: string; readonly text?: string | null }[]
          | null
      }[]
    | null
}

/** FAQ markup.
 *
 * ⚠️ **Built, and deliberately not wired to a route yet.** The `faqs` block
 * lives in the page builder, which this work package does not render. Emitting
 * FAQ markup for questions a visitor cannot see on the page violates Google's
 * requirement that structured data match visible content, and that is a manual
 * action rather than a missed opportunity. Wire this at the same moment the FAQ
 * block starts rendering, not before.
 *
 * **Tell clients the truth about what this earns.** In August 2023 Google
 * restricted FAQ rich results to well-known authoritative government and health
 * sites. An ordinary business will not get the expandable questions under their
 * search result, and anyone promising that is selling something that stopped
 * working three years ago. It is still worth emitting: it states the page's
 * questions and answers as machine-readable facts, which is what systems that
 * summarise rather than rank actually consume. */
export function buildFaqPage(
  items: readonly FaqInput[] | null | undefined,
): WithContext<FAQPage> | null {
  const questions = (items ?? [])
    .map((item): Question | null => {
      const text = toPlainText(item?.answer)
      if (!item?.question || !text) return null

      return {
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text },
      }
    })
    .filter((question): question is Question => question !== null)

  if (questions.length === 0) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions,
  }
}

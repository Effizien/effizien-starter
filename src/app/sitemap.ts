import type { MetadataRoute } from 'next'

import { ROUTE } from '@/lib/routes'
import { absoluteUrl } from '@/lib/seo/site-url'
import { client } from '@/sanity/lib/client'
import { SITEMAP_QUERY } from '@/sanity/queries'

/** `/sitemap.xml`, generated from the content.
 *
 * App Router native rather than `next-sitemap`. `02-STACK-V1.md` §6 leaves the
 * choice open — "next-sitemap *or* App Router native" — and native wins on the
 * rule in `AGENTS.md`: don't add a dependency without justifying it. The
 * framework does this now, and `next-sitemap` would additionally need a config
 * file and a postbuild script to do what forty lines do here.
 *
 * ## What is deliberately absent
 *
 * **`changeFrequency` and `priority`.** Google has stated plainly that it
 * ignores both. They exist in the sitemap spec, every tutorial sets them, and
 * they do nothing — so emitting them would mean a client's SEO consultant asks
 * why `priority` is 0.8, and there is no answer that is both honest and
 * satisfying. `lastModified` is the one hint Google does use, and only when it
 * is consistently accurate, which is why it comes from Sanity's own
 * `_updatedAt` rather than a field anyone maintains by hand.
 *
 * **Hidden documents.** The filter lives in the query, alongside the same rule
 * the metadata layer applies — see `SITEMAP_QUERY`.
 *
 * ## Addresses come from `ROUTE`
 *
 * The query returns slugs, not paths. Building the address here means the
 * sitemap, the canonical tag and the Studio's preview link are all derived from
 * the same functions, so a route change cannot leave the sitemap pointing at
 * addresses the site stopped serving.
 */

/* `useCdn: false`: a sitemap generated from a stale cache omits exactly the
   pages that were just published, which is the moment a sitemap matters most. */
const sitemapClient = client.withConfig({ useCdn: false })

/** ISO 8601 in, `Date` out. Next serialises it; an unparseable value would
 *  become "Invalid Date" in the XML, which some crawlers reject outright. */
function lastModified(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await sitemapClient.fetch(SITEMAP_QUERY)

  const entries: MetadataRoute.Sitemap = []

  /* The home page has no slug — its route is fixed. It is also the one document
     whose absence from the sitemap would be least noticeable and most costly. */
  if (content.home) {
    entries.push({
      url: absoluteUrl(ROUTE.home),
      lastModified: lastModified(content.home._updatedAt),
    })
  }

  for (const page of content.pages) {
    if (!page.slug) continue
    entries.push({
      url: absoluteUrl(ROUTE.page(page.slug)),
      lastModified: lastModified(page._updatedAt),
    })
  }

  for (const post of content.posts) {
    if (!post.slug) continue
    entries.push({
      url: absoluteUrl(ROUTE.post(post.slug)),
      lastModified: lastModified(post._updatedAt),
    })
  }

  return entries
}

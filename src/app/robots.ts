import type { MetadataRoute } from 'next'

import { absoluteUrl } from '@/lib/seo/site-url'

/** `/robots.txt`.
 *
 * ## Two jobs, and the second one prevents a real incident
 *
 * The first is ordinary: point crawlers at the sitemap, keep them out of the
 * API routes.
 *
 * The second is the preview deployment. It serves a complete copy of the site
 * on a public URL, and indexed, it competes with the real site for the same
 * queries — Google picks a winner and it is not always the right one. This file
 * is where `studio/schemaTypes/documents/site-settings.ts` says that switch
 * belongs: deliberately *not* a field an editor can toggle, because a global
 * "hide from search engines" control is genuinely useful on staging and
 * genuinely catastrophic if it survives to launch. Here it is visible in a diff
 * and covered by review.
 *
 * `Disallow` alone does not prevent indexing — a URL linked from elsewhere can
 * still be listed without a snippet. That is why the preview branch is paired
 * with an `X-Robots-Tag: noindex` header in `next.config.ts`. Neither is
 * sufficient on its own; together they are.
 *
 * ## AI crawlers
 *
 * The policy, the agent taxonomy, and the three distinctions worth knowing
 * before changing it are all in `src/lib/seo/ai-crawlers.ts`. The short version:
 * **allow everything by default**, because for a marketing site being read is
 * the point, and because "block AI" advice routinely conflates training
 * crawlers with the search crawlers that provide citations.
 */

/* Same signal `src/lib/seo/site-url.ts` uses. `NODE_ENV` is "production" during
   any `next build`, including on a laptop, so it cannot tell a real deployment
   from a local one. */
const isProductionDeployment = process.env.VERCEL_ENV === 'production'

export default function robots(): MetadataRoute.Robots {
  if (!isProductionDeployment) {
    /* Preview and local. No sitemap reference: advertising a map of a site you
       are asking crawlers to stay out of is a contradiction, and some crawlers
       fetch the sitemap regardless of the disallow. */
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        /* Route handlers return data, not pages. Nothing here has a useful
           search result, and `/api/draft-mode/enable` is a redirect into an
           authenticated editing session. */
        disallow: ['/api/'],
      },

      /* To stop this site being used as AI training data while staying citable
         in ChatGPT search, Claude search, Perplexity and Google, add:

             ...trainingCrawlerRules(),

         imported from `@/lib/seo/ai-crawlers`. Read the three distinctions in
         that file first — the common mistake removes a client from the surface
         they wanted to be cited in. */
    ],

    sitemap: absoluteUrl('/sitemap.xml'),
  }
}

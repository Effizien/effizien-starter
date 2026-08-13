import { buildLlmsTxt } from '@/lib/seo/llms'
import { client } from '@/sanity/lib/client'
import { LLMS_QUERY } from '@/sanity/queries'

/** `/llms.txt` — the site's map, for a language model.
 *
 * What this format is and what it is honestly worth is documented once, in
 * `src/lib/seo/llms.ts`. Short version: it costs a build step, it is durable,
 * and no major provider has confirmed reading it (D-007).
 *
 * A directory named `llms.txt` is a literal path segment, so this route handler
 * serves the file at exactly that address. Next has no special handling for
 * these the way it does for `robots.ts` and `sitemap.ts`, which is why this is
 * a route handler rather than a metadata file.
 */

/* Generated at build, not per request — the WP5 output says "at build" and the
   content only changes when content changes. A rebuild is triggered by the
   revalidation webhook, which is chunk 5. */
export const dynamic = 'force-static'

export async function GET() {
  /* useCdn: false, like the sitemap. This runs at the moment the CDN is most
     likely to be behind, and anything missed here is absent from the file
     until the next deploy. */
  const data = await client.withConfig({ useCdn: false }).fetch(LLMS_QUERY)

  return new Response(buildLlmsTxt(data), {
    headers: {
      /* text/plain, not text/markdown. The file *is* Markdown, but text/plain
         is what makes a browser display it instead of offering a download,
         and every published implementation of this format does the same. */
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

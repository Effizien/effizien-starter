import { buildLlmsFullTxt } from '@/lib/seo/llms'
import { client } from '@/sanity/lib/client'
import { LLMS_FULL_QUERY } from '@/sanity/queries'

/** `/llms-full.txt` — the full text of the articles, as one Markdown document.
 *
 * See `src/lib/seo/llms.ts` for the format and the honest assessment of what it
 * is worth.
 *
 * **Articles only.** Pages are composed of page-builder sections, and
 * serialising those to Markdown here would be a second rendering of the site —
 * one that would drift from the real renderer until the full-text file and the
 * page disagreed about what the page says. Pages appear in `llms.txt` with
 * their descriptions and gain full text when there is one renderer to derive it
 * from. `LLMS_FULL_QUERY` carries the same note.
 */

export const dynamic = 'force-static'

export async function GET() {
  const data = await client.withConfig({ useCdn: false }).fetch(LLMS_FULL_QUERY)

  return new Response(buildLlmsFullTxt(data), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

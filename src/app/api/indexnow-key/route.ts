import { getIndexNowKey } from '@/lib/seo/indexnow'

/** Serves the IndexNow key file.
 *
 * The file must live at `/<key>.txt` and contain the key. That path is not
 * knowable at build — it is whatever `INDEXNOW_KEY` is set to on this site — so
 * it cannot be a folder in `src/app`. `next.config.ts` rewrites `/<key>.txt`
 * here instead, which is the one place the value is available while routes are
 * being defined.
 *
 * Reachable directly at `/api/indexnow-key` as well. That is harmless: the key
 * is public by construction, and serving it at a second address proves domain
 * control just as well as the first.
 */

export const dynamic = 'force-static'

export async function GET() {
  const key = getIndexNowKey()

  /* No key configured is a normal state, not an error — the site simply does
     not use IndexNow. A 404 is the honest answer, and it is also what a search
     engine expects when the file is genuinely absent. */
  if (!key) return new Response('Not found', { status: 404 })

  return new Response(key, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

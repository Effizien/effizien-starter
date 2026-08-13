import { absoluteUrl, siteUrl } from './site-url'

/** IndexNow — tell search engines a URL changed, instead of waiting to be
 *  crawled.
 *
 * ## Tell clients the truth about what this covers
 *
 * **Google does not participate in IndexNow.** The participants are Microsoft
 * Bing, Yandex, Seznam and Naver. For a client whose search traffic is around
 * 90% Google — which is most UK, EU and US businesses — this affects well under
 * a fifth of it.
 *
 * Google's own equivalent, the Indexing API, is officially restricted to
 * `JobPosting` and `BroadcastEvent` content. Using it for ordinary pages is
 * against its terms. For everything else, Google discovers changes by crawling,
 * and the `lastmod` in our sitemap is the only hint it takes.
 *
 * So this is worth having — it is free, it is about forty lines, and it is
 * genuinely instant on the engines that support it. It is not worth describing
 * as "instant indexing" without naming who is missing from that sentence.
 *
 * ## The key is public by design
 *
 * IndexNow proves you control the domain by having you serve the key as a file
 * on it. Anyone can read it; that is the mechanism, not a leak. It still lives
 * in an environment variable rather than in the repo, because it is per-site
 * and a committed one would be copied into every clone — which would then all
 * be claiming the same key.
 *
 * It is deliberately **not** `NEXT_PUBLIC_`. Nothing in the browser needs it,
 * and the prefix would put it in the client bundle for no reason.
 */

const ENDPOINT = 'https://api.indexnow.org/indexnow'

/** IndexNow requires 8–128 hexadecimal characters. A key outside that shape is
 *  rejected at submission with an unhelpful error, so it is checked here. */
const VALID_KEY = /^[a-f0-9]{8,128}$/i

export function getIndexNowKey(): string | null {
  const key = process.env.INDEXNOW_KEY
  if (!key) return null

  if (!VALID_KEY.test(key)) {
    console.warn(
      '[indexnow] INDEXNOW_KEY must be 8–128 hexadecimal characters. Submissions are ' +
        'disabled. Generate one with: openssl rand -hex 16',
    )
    return null
  }

  return key
}

/** Where the key file is served. `next.config.ts` rewrites this to the route
 *  handler, because the path contains the key and cannot be a folder name. */
export function keyLocation(key: string): string {
  return absoluteUrl(`/${key}.txt`)
}

/** Submit changed URLs.
 *
 * Never throws. This runs inside a webhook whose actual job is revalidation —
 * a search engine being unreachable must not turn into a failed webhook and a
 * Sanity retry storm. Failures are logged and swallowed.
 *
 * Returns what happened, so the webhook can report it without re-deriving it.
 */
export async function submitToIndexNow(
  paths: readonly string[],
): Promise<{ submitted: number; status: string }> {
  const key = getIndexNowKey()
  if (!key) return { submitted: 0, status: 'skipped: INDEXNOW_KEY not set' }

  const urlList = [...new Set(paths)].map(absoluteUrl)
  if (urlList.length === 0) return { submitted: 0, status: 'skipped: nothing to submit' }

  /* A localhost or preview URL cannot be verified by a search engine, and
     submitting one is a guaranteed rejection plus a confusing log line. */
  const { hostname } = new URL(siteUrl)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { submitted: 0, status: 'skipped: site URL is localhost' }
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: hostname,
        key,
        keyLocation: keyLocation(key),
        urlList,
      }),
    })

    /* 200 and 202 both mean accepted. 403 means the key file could not be read
       — check the rewrite. 422 means a URL did not match the host. */
    if (!response.ok) {
      console.warn(`[indexnow] submission rejected: ${response.status}`)
      return { submitted: 0, status: `rejected: ${response.status}` }
    }

    return { submitted: urlList.length, status: 'accepted' }
  } catch (error) {
    console.warn('[indexnow] submission failed:', error)
    return { submitted: 0, status: 'failed: network error' }
  }
}

/** `410 Gone`.
 *
 * Every `gone` row in the redirect map is *rewritten* here by `next.config.ts`.
 * A rewrite keeps the visitor's original address in the URL bar and takes the
 * status from whatever the destination returns — which is the whole trick,
 * because `redirects()` can only emit 3xx and a 410 is not a redirect.
 *
 * ## Why a 410 rather than letting it 404
 *
 * They are not the same claim. A 404 says "nothing here", which a search engine
 * treats as possibly temporary and re-checks for months. A 410 says "this is
 * deliberately gone", and the URL drops out of the index in days.
 *
 * `AGENTS.md` requires every old URL to map to a new one *or a deliberate 410*,
 * and `studio/schemaTypes/documents/redirect.ts` models three outcomes rather
 * than a boolean specifically so an editor can say this. This route is the half
 * of that promise the frontend owes.
 *
 * ## Why the response has a body
 *
 * The status is for machines; a person still followed a link. An empty 410 is a
 * blank window. This is deliberately plain HTML with no styling and no data
 * fetching — it must work when the CMS is unreachable, which is exactly when
 * someone is most likely to be looking at it.
 */

/* Rendered at build. Nothing here depends on the request. */
export const dynamic = 'force-static'

const BODY = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Page removed</title>
</head>
<body>
<main>
<h1>This page has been removed</h1>
<p>It is not coming back, so there is nothing to update your bookmark to.</p>
<p><a href="/">Go to the home page</a></p>
</main>
</body>
</html>
`

function goneResponse(includeBody: boolean): Response {
  return new Response(includeBody ? BODY : null, {
    status: 410,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      /* Belt and braces. The 410 alone removes the URL from the index; this
         makes it true even for a crawler that reaches the body some other
         way. */
      'X-Robots-Tag': 'noindex',
    },
  })
}

export async function GET() {
  return goneResponse(true)
}

/** HEAD is how several crawlers and every link checker ask "is this still
 *  there?". Without it Next would answer 405, and a 405 is not a claim about
 *  the page at all — the URL would stay in the index. */
export async function HEAD() {
  return goneResponse(false)
}

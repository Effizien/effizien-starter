/** The one place the site's own address is decided.
 *
 * Every canonical, Open Graph and Twitter URL on the site is built from this
 * value, and `AGENTS.md` requires all of them to be absolute. That makes this
 * the single highest-consequence environment variable in the project: get it
 * wrong and every page on the site tells search engines it lives somewhere
 * else.
 *
 * It is deliberately *not* content. `studio/schemaTypes/documents/site-settings.ts`
 * says why: the value differs between production, a preview deploy and
 * localhost, and a canonical URL built from an editable field is one typo away
 * from pointing an entire site at the wrong domain with nothing in the Studio
 * showing it.
 *
 * ## Why the check is gated on `VERCEL_ENV` rather than `NODE_ENV`
 *
 * `NODE_ENV` is `production` during any `next build`, including the one
 * `pnpm check` runs on a laptop with `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
 * in `.env.local` — which is the value `.env.example` ships. Throwing on that
 * would break the ordinary local build for every developer, and a check that
 * fires constantly in a situation that is fine gets deleted.
 *
 * `VERCEL_ENV === 'production'` is the precise condition: a production
 * deployment on the platform this stack deploys to (D-003). Preview deploys and
 * local builds warn instead, because a preview deploy pointing at localhost is
 * untidy and a production one is a launch-day incident.
 */

const configured = process.env.NEXT_PUBLIC_SITE_URL
const isProductionDeployment = process.env.VERCEL_ENV === 'production'

/** Localhost, plus the address a Vercel deploy gets before a domain is
 *  attached. Neither is a canonical anyone wants indexed. */
function isPlaceholder(url: string): boolean {
  const { hostname } = new URL(url)
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.vercel.app')
  )
}

function resolve(): string {
  if (!configured) {
    if (isProductionDeployment) {
      throw new Error(
        'NEXT_PUBLIC_SITE_URL is not set on this production deployment.\n\n' +
          'Every canonical, Open Graph and Twitter URL is built from it, so without ' +
          'it this build would ship a site whose every page points search engines at ' +
          'http://localhost:3000.\n\n' +
          'Set it to the live https:// address in the Vercel project settings and ' +
          'redeploy.',
      )
    }

    console.warn(
      '[seo] NEXT_PUBLIC_SITE_URL is not set — falling back to http://localhost:3000. ' +
        'Canonical and sharing URLs will be wrong anywhere but a local machine.',
    )
    return 'http://localhost:3000'
  }

  let parsed: URL
  try {
    parsed = new URL(configured)
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL is not a valid URL: "${configured}"\n\n` +
        'It must include the protocol and the domain, with no path — ' +
        'https://example.com, not example.com and not https://example.com/.',
    )
  }

  if (isPlaceholder(configured) && isProductionDeployment) {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL is "${configured}" on a production deployment.\n\n` +
        'That address would be written into the canonical tag of every page on the ' +
        'site, telling Google the real content lives somewhere it cannot reach.\n\n' +
        'Set it to the live https:// address in the Vercel project settings.',
    )
  }

  /* Normalised to origin only. A trailing slash or a stray path here would be
     concatenated into every URL on the site, and "https://example.com//about"
     is a different address to Google than "https://example.com/about". */
  return parsed.origin
}

export const siteUrl = resolve()

/** A site-relative path as the absolute URL search engines are given.
 *
 * Pass the path — `/about`, or `ROUTE.post(slug)`. Passing an absolute URL
 * returns it unchanged, which is what makes this safe to wrap around a
 * `canonicalUrl` an editor typed. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString()
}

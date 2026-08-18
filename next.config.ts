import type { NextConfig } from 'next'

import { getRedirectMap } from './src/lib/redirects'
import { getIndexNowKey } from './src/lib/seo/indexnow'

/* Same signal `src/lib/seo/site-url.ts` and `src/app/robots.ts` use. `NODE_ENV`
   is "production" during any `next build`, including on a laptop, so it cannot
   tell a real deployment from a local one. */
const isProductionDeployment = process.env.VERCEL_ENV === 'production'

const nextConfig: NextConfig = {
  /* Fail the build on type errors rather than shipping broken code. This is the
     default, stated explicitly because the usual "fix" someone reaches for under
     launch pressure is to flip it to true — and a starter should make that an
     obvious, deliberate edit rather than a quiet one.

     There is no `eslint` key here: Next.js 16 removed it along with `next lint`,
     and this project lints with Biome (`pnpm lint`) rather than ESLint. */
  typescript: { ignoreBuildErrors: false },

  /* Sanity's asset CDN, and nothing else.
     `next/image` refuses to optimise a remote image from a host that is not
     listed here — a deliberate protection, since an open image proxy will be
     found and used to serve other people's traffic on your bill. Every image on
     the site comes from this one host, so the pattern is exact rather than a
     wildcard: `hostname` matches the full name, and the pathname is narrowed to
     the project's own asset directory. */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
        pathname: '/images/**',
      },
    ],
  },

  /* The redirect map, read from Sanity at build.
     `AGENTS.md`: every old URL maps to a new one or a deliberate 410. This half
     is the 3xx rules; the 410s are in `rewrites()` below, because
     `redirects()` cannot emit anything but a 3xx.
     A redirect published after a deploy takes effect on the *next* deploy — the
     same thing `studio/presentation.ts` tells the editor. */
  async redirects() {
    const { moved } = await getRedirectMap()
    return moved
  },

  /* Two rewrites, for two things that cannot be expressed any other way.
     A rewrite keeps the visitor's URL and takes its status from the
     destination, which is what lets a route handler answer 410. */
  async rewrites() {
    const { gone } = await getRedirectMap()
    const key = getIndexNowKey()

    return [
      ...gone,

      /* The IndexNow key file lives at `/<key>.txt`, and the key is per-site
         configuration — so the path cannot be a folder in `src/app`. This is
         the one place it is knowable while routes are being defined. */
      ...(key ? [{ source: `/${key}.txt`, destination: '/api/indexnow-key' }] : []),
    ]
  },

  /* Security headers. CSP is deliberately absent here: a useful policy depends
     on what each site actually embeds (Sanity Studio, analytics, embeds), so it
     is set per project rather than guessed at once for every client. The four
     below are safe on every site. */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },

      /* Keep preview deployments out of the index.
         `src/app/robots.ts` already disallows crawling everywhere but
         production, and that is not sufficient on its own: `Disallow` stops a
         crawler fetching a page, but a URL linked from anywhere else can still
         be listed — without a snippet, under the preview domain, competing with
         the real site. `noindex` is the part that actually keeps it out.
         Crawling and indexing are separate permissions, and a staging site
         needs both denied. */
      ...(isProductionDeployment
        ? []
        : [
            {
              source: '/:path*',
              headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
            },
          ]),
    ]
  },
}

export default nextConfig

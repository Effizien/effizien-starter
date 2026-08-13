import type { NextConfig } from 'next'

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

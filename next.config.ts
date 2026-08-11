import type { NextConfig } from 'next'

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
    ]
  },
}

export default nextConfig

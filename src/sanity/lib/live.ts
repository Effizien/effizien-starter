import { defineLive } from 'next-sanity/live'

import { client } from './client'
import { token } from './token'

/** Live Content API.
 *
 * This is the default fetching path. It handles caching and invalidation itself,
 * so reach for manual `revalidate`/`tags` only when you need control it can't
 * express — see 03-BUILD-PLAN WP5 and the Sanity Next.js rules for that table.
 *
 * `<SanityLive />` must be rendered in the root layout or none of this is live.
 *
 * Both tokens are the same Viewer-scoped read token. `browserToken` reaches the
 * browser only in draft mode; see token.ts for why that is safe and what makes
 * it unsafe. */
export const { sanityFetch, SanityLive } = defineLive({
  client,
  serverToken: token,
  browserToken: token,
})

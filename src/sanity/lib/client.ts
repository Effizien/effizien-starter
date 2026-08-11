import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId, studioUrl } from '../env'

/** The shared read client.
 *
 * `useCdn: true` is right for runtime page rendering — it is the fast path and a
 * few seconds of staleness is invisible to a visitor. Override it per call for
 * anything where staleness is a correctness bug:
 *
 *   client.withConfig({ useCdn: false }).fetch(SLUGS_QUERY)
 *
 * `generateStaticParams` and webhook handlers are the two that always need it,
 * because both run at the exact moment the CDN is most likely to be behind. */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
  stega: {
    /* Visual Editing injects invisible characters into strings so the Presentation
       tool can map rendered text back to its field. Enabled only when draft mode
       is on — see live.ts. Anything comparing a string to a literal must run it
       through stegaClean() first, or the comparison fails in edit mode only,
       which is a genuinely nasty bug to track down. */
    studioUrl,
  },
})

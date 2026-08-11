/** Sanity environment configuration.
 *
 * Project ID and dataset are NOT secrets. Sanity's own documentation is explicit
 * about this: they are visible in every API request the browser makes, which is
 * why they are `NEXT_PUBLIC_`. The API token is a different matter entirely —
 * see lib/token.ts.
 *
 * These throw rather than defaulting. A site that silently builds against the
 * wrong dataset is worse than one that refuses to build: the first failure mode
 * is a client's production site serving another client's content. */

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}\n\n` +
        `Copy .env.example to .env.local and fill it in. Project ID and dataset ` +
        `are on your project's page at https://www.sanity.io/manage`,
    )
  }
  return value
}

export const projectId = required(
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  'NEXT_PUBLIC_SANITY_PROJECT_ID',
)

export const dataset = required(
  process.env.NEXT_PUBLIC_SANITY_DATASET,
  'NEXT_PUBLIC_SANITY_DATASET',
)

/** Pinned, not floating. An API version is a date, and letting it drift means a
 *  Sanity API change can alter query results without a single line of our code
 *  changing. Bump it deliberately, and re-run the query tests when you do. */
export const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2026-02-01'

/** Where the standalone Studio lives. Used for "edit this" links and for the
 *  Presentation tool's origin. Set per site once the Studio is deployed. */
export const studioUrl =
  process.env.NEXT_PUBLIC_SANITY_STUDIO_URL ?? `https://${projectId}.sanity.studio`

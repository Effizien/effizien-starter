import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { PageBuilder } from '@/components/page-builder/page-builder'
import { ROUTE } from '@/lib/routes'
import { buildBreadcrumbList } from '@/lib/seo/json-ld/build'
import { buildMetadata } from '@/lib/seo/metadata'
import { client } from '@/sanity/lib/client'
import { sanityFetch } from '@/sanity/lib/live'
import { PAGE_QUERY, PAGE_SLUGS_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'

/** Any page with an address of its own.
 *
 * The page-builder sections an editor composed are rendered by `PageBuilder`,
 * which also owns which element becomes the page's `h1`.
 *
 * The blog index has no route of its own: it is an ordinary `page` with the
 * slug "blog" and falls through to here, which is exactly what
 * `studio/presentation.ts` tells the Studio. `/blog/:slug` is a separate,
 * more specific segment and cannot be swallowed by this one.
 */

type PageParams = { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  /* useCdn: false. This runs at the moment the CDN is most likely to be behind,
     and a slug missed here is a page that silently never gets built. */
  const slugs = await client.withConfig({ useCdn: false }).fetch(PAGE_SLUGS_QUERY)

  /* TypeGen types the result `Array<string | null>` — it cannot see that the
     `defined(slug.current)` filter has already excluded the nulls. Filtering
     rather than asserting keeps the guarantee in the code that depends on it. */
  return slugs.filter((slug) => slug !== null).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { slug } = await params

  const [{ data: page }, { data: site }] = await Promise.all([
    sanityFetch({ query: PAGE_QUERY, params: { slug }, stega: false }),
    sanityFetch({ query: SITE_SETTINGS_QUERY, stega: false }),
  ])

  /* A 404 has no canonical and no share card. Returning bare metadata rather
     than building one from an absent document keeps a mistyped URL from
     emitting a self-referencing canonical for a page that does not exist. */
  if (!page) return {}

  return buildMetadata({ seo: page.seo, site, path: ROUTE.page(slug) })
}

export default async function Page({ params }: PageParams) {
  const { slug } = await params
  const { data: page } = await sanityFetch({ query: PAGE_QUERY, params: { slug } })

  if (!page) notFound()

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-16 px-6 py-16">
      {/* No Article here — a page is not an article, and there is no schema.org
          type that says "a page" more usefully than the page itself already
          does. Breadcrumbs are the honest thing to state. */}
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', href: ROUTE.home },
          { name: page.title ?? 'Page' },
        ])}
      />
      {/* The `h1` is `PageBuilder`'s decision, not this route's: it comes from
          the first section when that section declares a heading, and from the
          title otherwise. See `heading-outline.ts`. */}
      <PageBuilder sections={page.pageBuilder} documentTitle={page.title} />
    </main>
  )
}

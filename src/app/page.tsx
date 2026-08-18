import type { Metadata } from 'next'
import { PageBuilder } from '@/components/page-builder/page-builder'
import { ROUTE } from '@/lib/routes'
import { buildMetadata } from '@/lib/seo/metadata'
import { sanityFetch } from '@/sanity/lib/live'
import { HOME_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'

/** The site root.
 *
 * The home page is an ordinary page-builder document that happens to live at a
 * fixed address. Everything the metadata, JSON-LD, sitemap and llms.txt bind to
 * is unchanged; `PageBuilder` renders the sections and decides whether the
 * page's `h1` comes from the first section or from the document title.
 */

export async function generateMetadata(): Promise<Metadata> {
  /* stega: false on every metadata fetch. The characters Visual Editing injects
     are invisible in the page body and perfectly real inside <title>, where
     they are copied into every search result and every share card. */
  const [{ data: home }, { data: site }] = await Promise.all([
    sanityFetch({ query: HOME_PAGE_QUERY, stega: false }),
    sanityFetch({ query: SITE_SETTINGS_QUERY, stega: false }),
  ])

  return buildMetadata({
    seo: home?.seo,
    site,
    path: ROUTE.home,
    /* The home page's title is the whole title. The template would otherwise
       render "Acme Roofing · Acme Roofing". */
    titleIsAbsolute: true,
  })
}

export default async function HomePage() {
  const { data: home } = await sanityFetch({ query: HOME_PAGE_QUERY })

  /* An empty dataset is a real state for a freshly scaffolded site, and a blank
     page gives whoever just cloned the starter nothing to act on. */
  if (!home) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-3 px-6 py-16">
        <h1 className="text-balance font-semibold text-4xl tracking-tight">
          No home page yet
        </h1>
        <p className="text-pretty text-lg text-muted-foreground">
          Create the Home page document in the Studio and it will appear here.
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-16 px-6 py-16">
      <PageBuilder sections={home.pageBuilder} documentTitle={home.title} />
    </main>
  )
}

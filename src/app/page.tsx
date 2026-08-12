import type { Metadata } from 'next'
import { ROUTE } from '@/lib/routes'
import { buildMetadata } from '@/lib/seo/metadata'
import { sanityFetch } from '@/sanity/lib/live'
import { HOME_PAGE_QUERY, SITE_SETTINGS_QUERY } from '@/sanity/queries'

/** The site root.
 *
 * ⚠️ **A route shell.** WP5 built the SEO and GEO layer; the page-builder
 * sections an editor assembles in the Studio are not rendered yet. What is here
 * is the part the metadata, JSON-LD, sitemap and llms.txt all bind to — the
 * document fetch, the address, and the single `h1`. Rendering the six section
 * types is a later work package, and it replaces the body of this component
 * without touching anything above it.
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

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-muted-foreground text-sm">effizien-starter</p>
        {/* Exactly one h1 per page; headings descend without skipping. */}
        <h1 className="text-balance font-semibold text-4xl tracking-tight">
          {home?.title ?? 'No home page yet'}
        </h1>
        <p className="text-pretty text-lg text-muted-foreground">
          {home
            ? 'Metadata, canonical URL and structured data are live on this route. Page-builder sections render in a later work package.'
            : 'Create the Home page document in the Studio and it will appear here.'}
        </p>
      </div>
    </main>
  )
}

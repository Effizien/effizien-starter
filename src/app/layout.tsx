import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { draftMode } from 'next/headers'
import { VisualEditing } from 'next-sanity/visual-editing'

import { siteUrl } from '@/lib/seo/site-url'
import { SanityLive, sanityFetch } from '@/sanity/lib/live'
import { SITE_SETTINGS_QUERY } from '@/sanity/queries'

import './globals.css'

/* --font-sans and --font-mono are consumed by the @theme block in globals.css.
   Renaming a variable here silently breaks the Tailwind font utilities. */
const fontSans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

/** The site name suffix, applied once.
 *
 * `studio/schemaTypes/objects/seo.ts` is explicit that the " — Acme Roofing"
 * suffix is a template set here and fed from `siteSettings`, never typed into a
 * page title. Typing it per page is how half a site ends up with it and half
 * without.
 *
 * This is why the root layout fetches: the template needs `siteName`, and a
 * hardcoded default would be wrong on every cloned site from the first commit.
 * `metadataBase` makes every URL Next emits absolute — without it Next produces
 * relative URLs that most crawlers and every social scraper resolve wrongly.
 */
export async function generateMetadata(): Promise<Metadata> {
  /* stega: false. Stega characters are invisible on the page but real inside
     <title>, and they are copied into every search result and share card. */
  const { data: site } = await sanityFetch({
    query: SITE_SETTINGS_QUERY,
    stega: false,
  })

  /* An empty dataset is the normal state of a freshly scaffolded site, so this
     falls back rather than throwing. The repo name is a visible placeholder —
     it shows up in the browser tab until Site settings is filled in, which is
     the intended nudge. */
  const siteName = site?.siteName ?? 'effizien-starter'

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: siteName,
      template: `%s · ${siteName}`,
    },
    description: site?.description ?? undefined,
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* lang is required for screen readers to select the right voice, and is a
       WCAG 2.2 AA failure if missing or wrong. Set it per client site. */
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="antialiased">
        {children}
        {/* Required for the Live Content API. Without it, sanityFetch still
            returns data but nothing ever updates without a full reload. */}
        <SanityLive />
        {/* Only mounted for an authenticated editor in draft mode, so the
            Visual Editing runtime never ships to ordinary visitors. */}
        {(await draftMode()).isEnabled && <VisualEditing />}
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

/* --font-sans and --font-mono are consumed by the @theme block in globals.css.
   Renaming a variable here silently breaks the Tailwind font utilities. */
const fontSans = Geist({ subsets: ['latin'], variable: '--font-sans' })
const fontMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

/* metadataBase makes every canonical, Open Graph and Twitter URL absolute.
   Without it Next emits relative URLs, which most crawlers and every social
   scraper resolve incorrectly. Per-route metadata is added in WP5. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Effizien Starter',
    template: '%s · Effizien Starter',
  },
  description:
    'Production website starter — Next.js App Router, Sanity, and Vercel, with SEO, GEO and WCAG 2.2 AA designed in from the start.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /* lang is required for screen readers to select the right voice, and is a
       WCAG 2.2 AA failure if missing or wrong. Set it per client site. */
    <html lang="en" className={`${fontSans.variable} ${fontMono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  )
}

import { ArrowUpRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

/* Placeholder home route. It exists to prove the stack renders end to end —
   Tailwind v4 utilities, the shadcn token layer, and a Radix-backed component —
   and is replaced by real content in WP4. Kept accessible so the a11y gates
   added in WP6 pass from the first commit rather than needing a retrofit. */

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="font-mono text-muted-foreground text-sm">effizien-starter</p>
        {/* Exactly one h1 per page; headings descend without skipping. */}
        <h1 className="text-balance font-semibold text-4xl tracking-tight">
          The stack is wired up.
        </h1>
        <p className="text-pretty text-lg text-muted-foreground">
          Next.js App Router, TypeScript in strict mode, Tailwind v4, and shadcn/ui on
          Radix primitives. Content, SEO and accessibility gates arrive in later work
          packages.
        </p>
      </div>

      <section aria-labelledby="next-heading" className="flex flex-col gap-3">
        <h2 id="next-heading" className="font-medium text-sm uppercase tracking-wide">
          Next
        </h2>
        <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
          <li>Sanity content model and embedded Studio</li>
          <li>Design tokens from Figma Variables</li>
          <li>SEO, GEO and WCAG 2.2 AA gates</li>
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <a href="https://nextjs.org/docs" rel="noreferrer noopener" target="_blank">
            Next.js docs
            {/* Decorative: the link already has an accessible name. */}
            <ArrowUpRight aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
        <Button asChild variant="outline">
          <a href="https://www.sanity.io/docs" rel="noreferrer noopener" target="_blank">
            Sanity docs
            <ArrowUpRight aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </Button>
      </div>
    </main>
  )
}

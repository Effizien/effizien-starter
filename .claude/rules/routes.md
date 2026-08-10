---
paths:
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
  - "src/app/**/route.ts"
  - "src/app/**/sitemap.ts"
  - "src/app/**/robots.ts"
---

# Route conventions

Loads when Claude reads a route file. SEO and GEO are designed in here, never bolted on.

## Metadata

- Every route exports `metadata` or `generateMetadata`. A page without a title and
  description is incomplete, not "to be filled in later".
- Canonical URLs are absolute and derived from a single configured site URL, never
  hand-written per page.
- Open Graph and Twitter card data come from the same source as the page content, so they
  cannot drift from it.

## Structured data

- JSON-LD is typed, generated from the same data the page renders, and injected via a
  `<script type="application/ld+json">` tag.
- Never hand-write JSON-LD that restates content the page already has — derive it, so the
  two cannot disagree.

## Rendering and data

- Static by default. Reach for dynamic rendering only when the page genuinely depends on
  the request, and say why in a comment.
- Sanity reads go through the shared client. Draft/preview reads use the authenticated
  client and must never run in a client component.
- Every list query is bounded. An unbounded GROQ query is a production incident waiting
  for the content set to grow.

## Accessibility

- One `h1` per page, and heading levels descend without skipping.
- `layout.tsx` sets `lang` on `<html>`.
- Landmarks are present and unique: one `main`, labelled `nav` if there is more than one.

# ADR-001 — Hand-written schema.org types instead of `schema-dts`

Date: 2026-08-12 · Status: **Accepted**

## Context

WP5 requires typed JSON-LD helpers for Organization, Article, Product, BreadcrumbList and
FAQ. "Typed" is the operative word: untyped JSON-LD is a plain object literal, and a
mistyped property name is silently dropped by every consumer rather than reported.

The obvious answer is `schema-dts` — Google's own generated TypeScript definitions for
the entire schema.org vocabulary. It is well maintained and it is what most projects
reach for.

Two constraints made it the wrong fit here:

- **`pnpm check` runs `tsc` before every commit**, and the project pins TypeScript 6
  rather than the faster TS 7 rewrite (Next.js 16 does not support TS 7 outside an
  experimental flag). `schema-dts` is a multi-megabyte declaration file of deeply nested
  unions, and it is a well-known contributor to slow type-checking. The cost lands on
  every commit, forever.
- **Its error messages are unusable at the point of failure.** A missing or misspelled
  property produces hundreds of lines of union candidates. A starter handed to clients
  should not make its most common structured-data mistake the hardest one to read.

Against that: this site emits **five** types, and each uses a handful of properties.

## Decision

Hand-write narrow interfaces for the five emitted types in
`src/lib/seo/json-ld/schema-org.ts`. Each is a deliberate subset of the real schema.org
vocabulary — only the properties this site fills in.

## Consequences

**Easier.** Type-checking stays fast. A wrong shape is a one-line error naming the
property. The file doubles as documentation of exactly what the site claims about itself,
readable by someone who does not know schema.org. Adding a property is a visible act in a
diff rather than an invisible one.

**Harder, and knowingly accepted:**

- **No compile-time guarantee that a property name is real.** Nothing stops someone
  adding `readonly authorName?: string` to `Article`; schema.org has no such property and
  it would be silently ignored by every consumer. The mitigation is the validator step in
  `docs/runbooks/seo-geo-audit.md` §4, which is a review-time check rather than a
  build-time one. This is the genuine cost of the decision.
- **Extending the vocabulary is manual.** Adding `Event` or `LocalBusiness` means reading
  schema.org and writing the interface, not importing it.
- **A second source of truth.** schema.org evolves; these interfaces do not evolve with
  it.

## Revisit trigger

**Either** of:

1. The number of emitted top-level types passes **twelve**. At that scale hand-writing is
   the larger job and the odds of an invented property rise faster than review catches
   them.
2. A client needs a vocabulary broad enough that its shape is not obvious from the
   content model — `Event` with offers and locations, `JobPosting`, or `LocalBusiness`
   with opening hours and geo. Any one of those is a signal that the vocabulary is now
   the domain rather than an annotation on it.

If either fires, measure `tsc` before and after adding `schema-dts` and record the number
here. TypeScript 7 restoring the compiler API for Next.js would also weaken the
performance half of this argument considerably.

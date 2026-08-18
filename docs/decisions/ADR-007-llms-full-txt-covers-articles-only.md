# ADR-007 — `llms-full.txt` continues to cover articles only

Date: 2026-08-18 · Status: **Accepted**

## Context

`/llms-full.txt` serves the full text of every public article as one Markdown document.
Pages are absent. WP5 left them out for a stated reason: a `page` is composed of
page-builder sections, and serialising those to Markdown would be a **second rendering of
the site** — one free to drift from the real one until the full-text file and the page
disagreed about what the page says.

That reason was provisional. It rested on there being no renderer at all, and
`03-BUILD-PLAN.md` names this as the one question WP12 must *decide rather than inherit*
once one exists. The renderer now exists: every block renders, and `/about`, `/pricing`
and the rest carry real substance that `llms-full.txt` does not expose.

The case for adding pages is not weak, and it is worth stating plainly. On a marketing
site the commercially important content — what a thing costs, what the company does, why
to choose them — lives on pages, not in the blog. Excluding pages means the file omits
exactly the material a language model would be asked about.

## Decision

**No. `llms-full.txt` continues to cover articles only.**

The drift objection survives the renderer, and WP12 produced evidence for it rather than
leaving it an argument. In chunk 3 this repository shipped, briefly, a second
representation of content that disagreed with the rendered page: `FAQPage` structured
data listing three answers that were **absent from the hydrated DOM**, because the
Accordion unmounted closed panels. The server-rendered HTML contained them, so it looked
correct under `curl`. It was caught only by a test that compared the two representations
directly — `e2e/structured-data.spec.ts` exists because of it.

That was one block, one property, and it still took a purpose-built browser test to see.
A Markdown serialiser for the whole page builder would have to replicate, and keep
replicating:

- which block types render at all — the dispatcher skips any `_type` not in its registry,
  so a page can legitimately contain a section that produces no output;
- the computed heading levels from `heading-outline.ts`, including the rule that a section
  with no heading promotes its contents up a level;
- link resolution, where an unresolvable destination renders as plain text rather than a
  link;
- the alt-text and decorative policy, which decides whether an image contributes any text
  at all.

Every one of those is a decision the React renderer makes. A second traversal either
duplicates all of them or quietly lies, and `to-markdown.ts` says in its own header that
it must never become that.

**The cheaper half of the problem was fixed instead.** Pages appeared in `llms.txt` as a
bare title and link whenever nobody had written a search description. They now fall back
to the opening section's introduction, which `hero.ts` already promises the editor is
used exactly this way. That is a projection of one existing field — not a parallel
rendering — and it is the distinction this ADR turns on.

## Consequences

**Easier.** There is one rendering of a page's content and it is the React one. Nothing
new can drift. `to-markdown.ts` keeps its narrow job — article bodies, whose Portable Text
is a linear document rather than a composed layout — and the block library can grow
without a second implementation growing beside it.

**Harder, and knowingly accepted:**

- **The file omits the site's most commercial content.** A language model asked what this
  business charges gets the article archive and a one-line description of the pricing
  page. That is a real gap in GEO coverage on precisely the pages a client cares most
  about, and it should be said out loud to a client rather than glossed as "we publish an
  llms.txt".
- **The gap widens as the block library grows.** Every block added makes pages richer and
  the omission larger.
- **A one-line fallback is thin.** The hero introduction is a sentence; the page may be
  two thousand words.

## Revisit trigger

**Either** of:

1. **A way exists to derive the text from the rendered output rather than from the
   content.** Extracting text from the built HTML — one rendering, read after the fact —
   voids the entire objection above, because there would be nothing to drift from. If Next
   makes the static output readable at build time in a supported way, this reopens
   immediately and the answer probably becomes yes.
2. **Observed demand.** A client's access logs show LLM crawlers fetching
   `/llms-full.txt`, or a client asks for their pages to be in it. The cost of being wrong
   is currently theoretical on both sides; traffic makes it measurable.

If either fires, the implementation to reach for is **not** a Markdown serialiser for the
page builder. It is derivation from the rendered page, for the reason this decision rests
on.

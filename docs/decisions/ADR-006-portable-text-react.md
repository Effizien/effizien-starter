# ADR-006 — `@portabletext/react` for rendering Portable Text

Date: 2026-08-17 · Status: **Accepted**

## Context

WP12 builds the presentation layer. Every `richText` field in the block library, every
`simpleRichText` answer in an FAQ, and every `post` body is Portable Text — a JSON
document format, not HTML. Something has to turn it into React elements.

This repository already holds two Portable Text serialisers, and both of them exist
because they are *not* renderers:

- `src/lib/portable-text/to-plain-text.ts` — words only, for JSON-LD and meta
  descriptions.
- `src/lib/portable-text/to-markdown.ts` — structure without presentation, for
  `/llms-full.txt`.

Both files say in their own doc comments that anything a browser displays goes through
`@portabletext/react`. This ADR is the decision those comments were anticipating, made
deliberately rather than inherited from a comment.

`AGENTS.md` requires a dependency to be justified rather than assumed, and the WP12 plan
calls for this one to carry an ADR. The alternative is writing the renderer by hand,
which is roughly 150 lines and looks deceptively simple. It is not, and the reasons are
specific rather than general:

- **Mark nesting is not a map over spans.** A run of text carrying `strong` and a link
  annotation is one span with two marks, and the correct output nests them in a
  particular order. Adjacent spans sharing a mark must not produce two adjacent
  `<strong>` elements. Getting this wrong produces valid-looking HTML with a wrong
  accessibility tree.
- **Lists are flat in the data and nested in the output.** Portable Text stores
  `listItem` and `level` on sibling blocks; the renderer has to group consecutive items
  into `<ul>`/`<ol>` and nest by level. This is the part hand-written renderers
  reliably get wrong, and it fails as invalid markup rather than as an error.
- **It is the reference implementation.** Sanity maintains it against the Portable Text
  specification, so a schema change that alters the data shape is handled upstream.

Against that, the package is small, has no runtime dependencies beyond its own toolkit,
and is dev-visible rather than user-visible in bundle terms — the block library it
renders is far larger than the renderer.

## Decision

Add `@portabletext/react` (8.0.0, pinned exactly) and render every Portable Text field
through it, via one shared component in `src/components/portable-text.tsx`.

The component owns the *policy* — which styles map to which elements, how heading levels
are derived, how links and images resolve. The package owns the *traversal*. That split
is what keeps the dependency replaceable: the rules live in this repo.

**The two existing serialisers stay.** They are not made redundant by a renderer, because
they answer a different question — "what does this say" rather than "what does this look
like". `to-markdown.ts` in particular must never grow into a second renderer, for the
reason its own header gives.

## Consequences

**Easier.** Mark nesting and list grouping are correct without anyone in this repository
having to think about them again. A new block type with a rich-text field is a component,
not a parsing problem. Heading levels stay derived, because the component passes a
computed level into `richTextHeadingLevel` rather than reading a stored one.

**Harder, and knowingly accepted:**

- **A third rendering of the same content now exists** — React, Markdown, plain text —
  and they can disagree. The React one is authoritative; the other two are lossy by
  design and documented as such. The open question about whether `llms-full.txt` should
  cover page-builder pages is exactly this tension, and WP12 chunk 6 decides it.
- **A dependency in the render path of every page.** A breaking change in it is a
  breaking change to the whole site. Mitigated by the exact pin and by the policy living
  here rather than in the package's defaults.
- **The package's defaults are wrong for this schema and must be overridden**, not
  accepted. Its unstyled default emits `<h1>`–`<h6>` from stored style names, which is
  precisely what `page-builder/heading-outline.ts` exists to prevent. An override that
  someone later deletes as redundant would reintroduce stored heading levels silently.

## Revisit trigger

**Either** of:

1. **The component's overrides grow past roughly the size of the package's own
   renderer** — meaning this repository is doing the work anyway and paying for a
   dependency to traverse an array. Measure it as: the overrides in
   `src/components/portable-text.tsx` exceed 200 lines excluding comments.
2. **A major version requires changes to the block library's schema** rather than to the
   component. That would mean the package's model and this project's content model have
   diverged, and the traversal is no longer neutral.

If either fires, the fallback is a hand-written traversal in this repo, keeping the same
component boundary — the policy is already here, so the migration is the traversal only.

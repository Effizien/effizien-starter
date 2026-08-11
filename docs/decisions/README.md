# Architecture Decision Records

One file per decision, numbered, never deleted. When a decision changes, add a new ADR
that supersedes the old one and mark the old one `Superseded by ADR-00X`. The history of
why something *was* true is often more useful than the current state alone.

Copy `_template.md` to `ADR-00X-short-slug.md`.

## What earns an ADR

Anything a future reader would otherwise reverse without realising it was deliberate:

- choosing or rejecting a dependency
- a content-model shape that constrains future pages
- a caching, rendering, or revalidation strategy
- a deliberate deviation from the starter's defaults
- anything argued about for more than ten minutes

Not everything needs one. If the answer is obvious from the code, let the code say it.

## The revisit trigger is the part that matters

Every ADR names the specific condition that reopens it. This is the field people skip and
the one that does the work — **a decision without a trigger calcifies into dogma**, and
teams end up defending a choice whose original reason expired long ago.

A good trigger is observable: "the same fix has to be applied by hand to 3+ sites",
"bandwidth exceeds $150/mo on a single site". A bad one is a feeling: "when it becomes a
problem".

## Site-level vs system-level

These ADRs cover **this site**. Decisions about the starter itself — framework, CMS,
hosting, design system — live in the `effizien-system` repo's decision record and are not
relitigated here. If work on this site would change one of those, raise it there rather
than quietly diverging.

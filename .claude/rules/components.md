---
paths:
  - "src/components/**/*.tsx"
  - "components/**/*.tsx"
  - "src/app/**/*.tsx"
---

# Component conventions

Loads when Claude reads a component file. Conventions for *creating* components live in
`AGENTS.md`, because path-scoped rules do not fire on new-file creation.

## Design system

- shadcn/ui **copied in** from our registry, not installed as a package. Components are
  ours to edit once copied — upstream is a starting point, not a dependency.
- There is no published `@effizien/ui` package yet, and adding one is explicitly deferred
  until the same component fix has to be applied by hand across 3+ sites (D-004).
- Tailwind v4, CSS-first config. Design tokens come from Figma Variables via Style
  Dictionary — never hardcode a hex value, spacing number, or font size in a component.
- Variants use CVA. A component with more than two boolean props controlling appearance
  should be a variant, not a pile of conditionals.

## Server and client boundaries

- Server Components are the default. Add `'use client'` only for interactivity, and push
  it to the smallest leaf that needs it.
- Never import a server-only module (anything reading `process.env` secrets, or the
  authenticated Sanity client) into a client component.

## Accessibility — WCAG 2.2 AA is a gate, not a goal

- Semantic HTML first. A `div` with an `onClick` is a defect; use a `button`.
- Every interactive element is keyboard reachable, has a visible focus indicator, and has
  an accessible name.
- Contrast is validated at the token level. If a new color pairing is needed, check it
  before building against it — retrofitting contrast means redesigning.
- Images carry meaningful `alt`, or `alt=""` when decorative. Never omit the attribute.

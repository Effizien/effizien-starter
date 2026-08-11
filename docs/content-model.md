# Content model — [CLIENT NAME]

The map between what editors see in the Studio and what the site renders. Keep it current:
this is the document a developer reads before touching a schema, and the one an editor's
question gets answered from.

Schema source: `studio/schemaTypes/`. Generated types: `sanity.types.ts` (run
`pnpm typegen` after any schema or query change).

> **Not yet built.** The reusable schema library — base types, the three archetypes, and
> the page-builder block library — is WP4. This file describes what to record once it is.

## Document types

| Type | Purpose | Who creates it | Notes |
|---|---|---|---|
| [ ] | [ ] | [ ] | [ ] |

## Objects and blocks

Reusable embedded types (SEO object, link, image with alt) and page-builder blocks.

| Type | Used by | Notes |
|---|---|---|
| [ ] | [ ] | [ ] |

## Editorial rules

The guardrails that keep a non-technical editor from breaking the site. Record the *why*,
not just the constraint — an editor who understands the reason works with it rather than
around it.

- **Required fields:** [which, and what breaks without them]
- **Character limits:** [where, and why — usually layout or SEO truncation]
- **Image requirements:** every image needs `alt` text, or an explicit "decorative" flag.
  Never leave the attribute off.
- **Slugs:** [how generated, whether editable after publish — changing a live slug needs
  a redirect]
- **Publishing:** [who approves, whether drafts are previewed before publish]

## Relationships

Which documents reference which, and what happens on delete. A referenced document that
disappears is one of the most common sources of a broken production page.

## Localisation

[Not enabled | Document-level i18n via Sanity, locales: …]

## Migration notes

Anything imported from a previous system, and anything a future migration would need to
know — legacy field names, values that were transformed, records deliberately dropped.

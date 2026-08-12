# Content model — [CLIENT NAME]

The map between what editors see in the Studio and what the site renders. Keep it current:
this is the document a developer reads before touching a schema, and the one an editor's
question gets answered from.

Schema source: `studio/schemaTypes/`. Generated types: `sanity.types.ts`
(run `pnpm typegen` after any schema or query change).

## The three layers

```
studio/schemaTypes/
├── shared/      field helpers, validation, limits — not schema types
├── objects/     reusable embedded types (seo, link, mediaImage, richText)
├── blocks/      page-builder sections + the pageBuilder array itself
├── documents/   base document types every site has
├── archetypes/  marketing bundle
├── catalog/     catalogue bundle
└── docs/        documentation bundle
```

Sanity has **one flat type registry**. A type is addressable only by its `name`, so
`type: 'mediaImage'` resolves regardless of which directory the file sits in. The
directories are for people; `schemaTypes/index.ts` is what Sanity sees.

## Archetype — one line, in `studio/archetype.ts`

```ts
export const ARCHETYPE: Archetype = 'marketing'   // 'marketing' | 'catalog' | 'docs'
```

All three models live in the repo; **exactly one is registered**. That is correctness, not
tidiness: an unused `product` type would still appear in the editor's Create menu, still be
a valid reference target, and still generate types the frontend has no route for.

Switching also swaps the archetype's page-builder blocks and its internal-link targets,
both driven from the same constant. **Do not switch after content exists** — documents of
the old archetype stay in the dataset and become unreachable rather than being migrated.

## Base document types

| Type | What it is | Notes |
|---|---|---|
| `page` | Generic page, composed from the page builder | The default answer; a new type must earn its place |
| `homePage` | The site root | **Singleton** |
| `navigation` | Header and footer menus | **Singleton** |
| `siteSettings` | Name, contact, social, SEO defaults | **Singleton** |
| `redirect` | One old URL → one new URL | Consumed by `next.config.ts` (WP5) |

**Singletons are enforced in Structure, not schema.** There is no `singleton: true` option.
Three mechanisms hold each one in place, all reading `studio/document-types.ts`: a fixed
`_id` in `structure.ts`, removal from the Create menu, and removal of Delete/Duplicate.
Any one missing and the guarantee is not a guarantee.

## Marketing archetype (active)

| Type | What it is |
|---|---|
| `post` | Dated, authored article. Has a `body`, **not** a page builder |
| `person` | Article author, team member |
| `category` | Subject taxonomy for articles |
| `articleList` | Page-builder block listing recent or chosen articles |

`post` deliberately uses `richText` rather than the page builder: a page builder is for
flexible layouts, not formulaic content. Articles assembled from hero blocks read badly,
index badly, and cannot be excerpted.

## Objects and blocks

**Objects:** `seo`, `mediaImage`, `link`, `navigationGroup`, `navigationLink`,
`socialLink`, `richText`, `simpleRichText`, `action`, `featureItem`, `faqItem`,
`testimonial`.

**Page-builder blocks:** `hero`, `textSection`, `features`, `faqs`, `testimonials`,
`callToAction`, plus whatever the archetype adds.

## Editorial rules

**Error vs warning is a content decision.** An error blocks publishing; a warning advises.
The policy is in `shared/editorial-guardrails.ts`:

- **Error** when publishing breaks something the editor cannot see — the page renders
  blank, two documents fight over one URL, an accessibility guarantee fails, a menu
  renders empty.
- **Warn** when it renders correctly but badly — a title Google truncates, alt text long
  enough to become a wall of speech.
- **Never error on something the editor cannot fix from inside the document.** The only
  available response is to give up, and the next thing they learn is who to ask to have
  the validation removed.

Every message names the consequence and the next action. "Required" tells an editor they
did something wrong and nothing else.

**Images:** `mediaImage` requires alt text, with an explicit *decorative* flag as the
escape hatch. An image field that lets alt be forgotten is a defect against WCAG 2.2 AA.

**Headings:** heading levels are **never stored in the schema**. They are derived in the
frontend from section position (`src/lib/page-builder/heading-outline.ts`), so an editor
cannot produce an h1→h3 jump by reordering sections.

**Slugs:** changing a slug on a live document is a dead URL. The slug field warns when a
published document's address changes without a matching `redirect`.

## SEO

Every routable document carries the shared `seo` object. Every field is an **override** —
leave it empty and the query falls back to content the page already has. The GROQ contract
(the `coalesce` shape WP5 implements) is documented at the top of `objects/seo.ts`.

## Localisation

Not enabled. It is a deferred MODULE, and the model is shaped so it can be added
**without a migration**: document-level localisation gives each locale its own document,
so no field here changes type. Field-level localisation would mean changing `string` to
`internationalizedArrayString` — a type change, and therefore a migration of every
document already written.

## Changing the schema after launch

**Never delete a field that holds production data.** Follow deprecate → readOnly → hidden,
then migrate with `sanity migrations run` (dry run first), then remove the definition. The
pattern is in Sanity's schema rules; the short version is that deleting a live field causes
data loss or Studio crashes.

## Known issue

`toSlug` exists twice — `shared/slug-field.ts` (document slugs, truncates at 96) and
`shared/editorial-guardrails.ts` (heading anchors, truncates at 64). Near-identical
algorithms, different contracts, **different limits**. They must not be merged without
deciding which limit wins, because unifying them changes the slug generated for any title
over 64 characters — and a changed slug on a live document is a dead URL. Revisit when
WP6 brings tests to change them under.

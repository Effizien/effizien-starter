# WP5 — SEO & GEO module: progress and resume point

**Temporary.** This file exists while WP5 is mid-build so a new session can pick it up
cold. When WP5 completes it folds into `../effizien-system/docs/handoffs/WP5-seo-geo.md`
and gets deleted from here.

Branch: `wp5/seo-geo-module` · Last updated 2026-08-12

---

## Where it stands

| Chunk | Scope | Status |
|---|---|---|
| 1 | Metadata spine — GROQ projection, `buildMetadata`, site URL, route shells | ✅ `62763c7` |
| 2 | Typed JSON-LD helpers | ⬜ next |
| 3 | `sitemap.ts` + `robots.ts` with AI crawler policy | ⬜ |
| 4 | `llms.txt` / `llms-full.txt` + portable-text→markdown | ⬜ |
| 5 | Redirect map + IndexNow | ⬜ |
| 6 | GSC/GA4 runbook, audit checklist, ADRs, handoff | ⬜ |

`pnpm check` passes on chunk 1.

---

## Decisions the operator made at kickoff — do not reopen

These were answered in conversation and are recorded nowhere else.

1. **Route shells are in scope.** No work package owns the frontend rendering layer;
   WP5 could not attach metadata to routes that did not exist. Thin shells were built:
   document fetch, address, one `h1`. **Page-builder section components are still not
   built and are not WP5's job.**
2. **JSON-LD types are hand-rolled, not `schema-dts`.** Five shapes, ~120 lines. The
   dependency is a multi-megabyte `.d.ts` whose unions slow `tsc` on every `pnpm check`.
3. **No middleware.** `next.config.ts` cannot emit 410, but `rewrites()` can send a path
   to a Route Handler, and a handler returns any status it likes. So `gone` rows rewrite
   to `/_gone`, which returns 410. Whole redirect map in one mechanism, no per-request
   middleware cost. WP7 introduces middleware when Statsig actually needs it.
4. **A Sanity outage failing the build is acceptable.** Redirects are fetched at build
   time. Falling back to an empty list would silently drop the redirect map, which is the
   failure `AGENTS.md` calls the most damaging and most preventable in this business.
   Fail loud, wait it out, redeploy. One retry, so a two-second blip does not cost a
   deploy cycle.
5. **Production site URL is enforced.** Done in chunk 1 — see `src/lib/seo/site-url.ts`.

### Scope posture

Stated directly by the operator, and it should shape every remaining chunk: **this is for
his own sites and two to three non-critical client sites.** Not enterprise. Perfect SEO
and GEO is not the goal; scalable seams are. Things can be refactored.

The split being worked to:

- **Expensive to retrofit, get right:** the GROQ projection shape (every route consumes
  it), `ROUTE` as the sole owner of addresses, the `noIndex` polarity, absolute canonicals.
- **Cheap to refactor, first draft is fine:** robots policy, llms.txt format, the markdown
  serializer, the audit checklist. Revise when a real site disagrees.

---

## What chunk 2 must honour

**JSON-LD derives from the content, never from the `seo` object.** WP4's contract is
explicit: the `seo` object says how a page is *presented* in a result; structured data
says what the page *is*. Feeding one from the other is the thing Google actually
penalises. `Article` takes `headline` from `title`, not `seo.title`.

**Helpers take plain typed inputs, not generated Sanity types.** `ARCHETYPE` is
`marketing`, so `product` is not registered and `sanity.types.ts` has no `Product`. A
`product.ts` helper importing a generated type would not compile on this archetype. Keep
the helper signatures structural so all five compile under every archetype.

Fields already projected in `POST_QUERY` for this purpose: `publishedAt`, `_updatedAt`,
`excerpt`, `mainImage`, `author->{name, role}`, `topics[]->{title}`. `SITE_SETTINGS_QUERY`
already returns `logo`, `socialLinks`, `contactEmail`, `contactPhone`, `postalAddress`
for `Organization`. Neither query needs changing.

`BreadcrumbList` derives from `ROUTE` — Home → Blog → Post for a post. There is no
breadcrumb field in the schema and there must not be one.

---

## Traps found in chunk 1

**A metadata key set to `undefined` is not the same as an absent key.** Next merges route
metadata into the layout's field by field, and `title: undefined` counts as the route
having set it — it overrides `title.default` and empties the browser tab on every
document without a title, which is every document on a fresh site. Keys are spread in
conditionally. Caught in the browser, not by `tsc`.

Once that was fixed, `og:title` and `twitter:title` could be dropped entirely: Next
derives both from the resolved title with the template applied. Verified in the DOM.

**TypeGen only resolves template interpolation within one file.** `SEO_PROJECTION` is
interpolated into four queries; moving it to a module of its own generates every one of
them as `unknown`. That is why `src/sanity/queries.ts` is a single file.

**TypeGen types slug lists as `Array<string | null>`** — it cannot see that
`defined(slug.current)` already excluded the nulls. Filter, do not assert.

**The dataset is empty.** No documents of any type. So the projection is verified
structurally (TypeGen evaluated it against the real `schema.json`) and semantically, but
not against live content. The sharing-image path and `stega: false` behaviour are
**unverified** — both need real documents. Seeding a handful of test documents was
offered and not yet taken up.

### Verifying GROQ without content

`groq-js` evaluates a query against an in-memory dataset. This proved the `noIndex`
polarity — a document with no `seo` key at all projects `false`, so it stays indexable.
Worth reusing for any projection whose failure mode is silent. Run it from the session
scratchpad with `npm install groq-js --no-save`; do not add it to the repo.

---

## Honesty flags for the client-facing write-up

The operator asked for these explicitly — "honesty over optimism, because I have to tell
clients the truth." They belong in the WP5 handoff and in the audit checklist.

- **`llms.txt` has no confirmed consumer.** Publishing adoption is real; consumption by
  OpenAI, Anthropic or Google is unannounced. Google's John Mueller compared it to the
  keywords meta tag. Cheap insurance, not a ranking lever. This is what D-007 already says.
- **IndexNow does not include Google.** Bing, Yandex, Seznam, Naver. For a client whose
  search traffic is ~90% Google it touches under a fifth of it. Google's own Indexing API
  is officially restricted to `JobPosting` and `BroadcastEvent`.
- **FAQ structured data no longer earns a rich result** for ordinary sites — Google
  restricted FAQ rich results to authoritative government and health domains in August
  2023 and removed HowTo entirely. Still worth emitting as machine-readable facts. Not
  worth promising as FAQ dropdowns in Google.
- **Structured data is not a ranking factor.** Rich-result eligibility plus
  machine-readable facts. Both real, neither a ranking lever.
- **robots.txt is advisory.** Blocking AI crawlers there is a request, not enforcement.
  Real enforcement is edge/WAF.
- **Blocking `Google-Extended` does not remove you from AI Overviews.** It governs Gemini
  training and grounding; AI Overviews run off the ordinary Googlebot index, and the only
  exit is `nosnippet`/`max-snippet:0`, which also destroys the normal search snippet.
  Likewise `GPTBot` (training) is not `OAI-SearchBot` (ChatGPT's search surface). Most
  "block AI" advice conflates them and quietly removes the client from the surface they
  wanted to be cited in. **Chunk 3 default: allow everything, with the block list present
  and commented so it is a client decision made with the facts.**
- **"GEO" as a discipline rests on one 2024 KDD paper** whose headline numbers come from a
  synthetic benchmark the authors built. Suggestive, not established.

---

## Carried from WP4 — still true

- **The adversarial editor-experience and schema-evolution reviews never ran** (spend
  limit). The content model has had no independent review. **WP5 has changed no schema
  file and should not need to** — if a chunk appears to require one, stop and raise it
  rather than edit.
- **`toSlug` is deliberately duplicated** in `studio/schemaTypes/shared/` with different
  truncation limits (96 for document slugs, 64 for heading anchors). Do not merge them.
- WP5 adds a second, similar duplication: `ROUTE` in `src/lib/routes.ts` mirrors
  `studio/presentation.ts`. Both files carry the warning. A test asserting they agree is
  a WP6 item.

---

## Resume prompt

> Continuing **WP5 — SEO & GEO module** in `~/Documents/effizien/effizien-starter`, on
> branch `wp5/seo-geo-module`. Read `docs/wp5-progress.md` first — it carries the
> decisions already made, the traps found, and the chunk plan. Chunk 1 (metadata spine)
> is committed and `pnpm check` passes. Build chunk 2: the typed JSON-LD helpers.
> Hand-rolled types, derived from content and never from the `seo` object, structural
> signatures so all five compile under any archetype. Work in reviewable chunks and stop
> between them.

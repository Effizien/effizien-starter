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
| 2 | Typed JSON-LD helpers | ✅ `dd3b7b4` |
| 3 | `sitemap.ts` + `robots.ts` with AI crawler policy | ✅ `5b27ceb` |
| 4 | `llms.txt` / `llms-full.txt` + portable-text→markdown | ✅ this commit |
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

**A stale Next fetch cache will lie to you about content.** After seeding, the site kept
rendering the *old* site-settings fallback through two dev-server restarts, while the
Sanity CDN returned the new values correctly. Cause: `SITE_SETTINGS_QUERY` had run during
an earlier `pnpm build` when the dataset was empty and was cached as `null`; the page
queries were never cached because those documents did not exist yet. `rm -rf .next` fixed
it. **After any content change that should be visible, clear `.next` before concluding
the code is wrong** — the symptom looks exactly like a broken query.

**The dataset now has seed content** (added 2026-08-12, published): `siteSettings`
(siteName "Effizien"), `homePage`, four `page` documents — `about` (no seo at all),
`pricing` (title + description override), `thank-you` (`searchVisibility: hidden`),
`why-flat-roofs-fail` (external `canonicalUrl`) — plus `person-jane` and one `post`,
`how-long-a-flat-roof-lasts`, with excerpt, publishedAt and author.

Two things caught while seeding: the dataset had a **draft-only** `siteSettings` before
any of this, which a published-perspective query reports as an empty dataset; and a
reference to a document that exists only as a draft is rejected, so authors must be
published before the posts that reference them.

**Verified end to end against that content:** title template `%s · Effizien` from
`siteSettings`, home page title absolute (no suffix), `seo.title`/`seo.description`
overrides, `excerpt` → description on the post, site-description fallback on pages with
neither, external canonical passed through untouched, `noindex, follow` on the hidden
page, `og:site_name`, and **no stega characters in any `<title>`**.

**Still unverified: the sharing-image path.** It needs one real image asset and the
Sanity MCP has no asset-upload tool. Cheapest fix is to drag any image into the sharing
image field of `siteSettings` in the Studio once, then re-check `og:image`.

**Verified in chunk 2:** with `seo.title` set to a different string on the seeded post,
the page `<title>` takes the override while `Article.headline` keeps the post's own
title — WP4's content-versus-presentation rule, demonstrated rather than asserted. The
`JsonLd` escaping was verified by putting a literal `</script><img src=x onerror=…>` in
an excerpt: the raw sequence never reaches the HTML, the escaped form does, and all
three blocks still parse. Payload reverted; the `seo.title` override was kept as seed
data because it keeps that path exercised.

**Verified in chunk 3, and worth keeping:**

- **`VERCEL_ENV`, not `NODE_ENV`, is the production signal.** `NODE_ENV` is `production`
  during any `next build`, including on a laptop, so it cannot distinguish a real deploy.
  Three files now depend on this: `lib/seo/site-url.ts`, `app/robots.ts`, `next.config.ts`.
- **`VERCEL_ENV=production pnpm build` with a localhost site URL fails the build**, with
  the intended message. Run it before a launch as a cheap rehearsal.
- **GROQ treats `null != "hidden"` as true**, so the sitemap filter includes documents
  saved before the field existed. Verified with groq-js. Note the two rules are
  deliberately different shapes: `noIndex` asks "did the editor hide this?" and must be
  false when absent; the sitemap asks "may this be listed?" and must be true when absent.
- **Crawling and indexing are separate permissions.** `Disallow` stops a fetch; a linked
  URL can still be indexed without a snippet. Preview deploys need both — `robots.ts`
  disallows, and `next.config.ts` sends `X-Robots-Tag: noindex`. Neither alone is enough.

**Verified in chunk 4, against a deliberately rich seeded article body** — headings,
nested lists, bold, italic, an external link and a blockquote. Two formatting defects
that only a real body would have exposed:

- **A blank line between list items makes the list "loose"**, wrapping each item in its
  own paragraph. Portable Text has no loose-list concept, so emitting one invents
  formatting the editor never asked for. `toMarkdown` now joins consecutive list items
  with a single newline.
- **Nested list indent must be three spaces, not two.** CommonMark nests a child only
  when it is indented at least as far as the parent's content begins, and a numbered
  marker (`1. `) is three characters wide. Two spaces nests correctly under a bullet and
  silently becomes a *sibling* list under a number — a change to the document's meaning,
  not its appearance.

The seeded post now carries that rich body permanently, so the serializer stays
exercised. Its `seo.title` override is also still in place from chunk 2.

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

# WP4 content model — adversarial review

2026-08-13 · Closes the gap named in `effizien-system/docs/handoffs/WP4-content-model.md`

WP4 shipped with two reviews unrun: **editor experience** and **schema evolution**. Both
died on a spend limit. This is those two reviews.

## Method, and its limit

Read the base model — `documents/`, `objects/`, `blocks/`, `shared/` — plus the archetype
bundles where they touch shared contracts. Findings were confirmed by tracing actual
usage across the codebase, not by reading a file in isolation; both high-severity findings
below are things that look correct in the file they live in and are wrong in the graph.

**The limit worth stating:** this review was run by the same assistant that built WP5
against this model. That is adversarial about *WP4's* code — none of it is mine — but it
is not a fresh view of the project's assumptions. A reviewer who had never seen the
starter would question things that now read as settled. Findings E1 and S1 were both
found by checking a claim that everyone, including this reviewer at the start of the
session, had accepted as true.

---

## Editor experience

### E1 · Renaming a page warns nobody. Renaming an article does. — **High**

`shared/slug-field.ts` exists to make one thing safe: an editor changing the address of a
live document. Its third rule queries the published document, compares addresses, checks
whether a `redirect` already covers the old one, and if not says so — naming both
addresses and the redirect to create.

**`documents/page.ts` does not use it.** It hand-rolls its slug field from
`editorial-guardrails` (`slugifySegment`, `describeSlugProblem`, `isSlugUnique`) and gets
format, length and uniqueness checks — but **no redirect check**.

Every other routable type in the repo uses `slugField()`: `post`, `person`, `category`,
`product`, `productCategory`, `docPage`. `page` is the exception, and `page` is the
document type every archetype ships, the one a marketing site is almost entirely made of,
and the one the blog index itself is.

Consequences:

- An editor renames `/pricing` to `/our-prices`, publishes, and nothing in the Studio
  mentions that every existing link now 404s.
- The loop `slug-field.ts` describes as closed — warn → editor creates a redirect → WP5
  reads it into `next.config.ts` — is open for the most common type on the site.
- `AGENTS.md` calls losing search equity the most damaging and most preventable failure in
  this business. This is the preventable half, unwired on the type it matters most for.

**Fix:** replace the hand-rolled field in `page.ts` with
`slugField({ group: 'content' })`. See S1 — the same change resolves that finding.

### E2 · The address help text on `page` does not name the real address — **Low**

`slugField()` takes `pathFor` so every message names the URL the site actually serves —
`/blog/my-article` on a post. `page.ts` hardcodes an example instead. Cosmetic on a type
served at `/:slug`; it becomes wrong the moment a client site nests pages.

Resolved by the same fix as E1.

### E3 · Field groups are declared inline on four types and shared on the rest — **Low**

`page`, `homePage`, `navigation` and `siteSettings` each declare `groups:` inline;
`post` uses `DOCUMENT_FIELD_GROUPS` from `shared/field-groups.ts`. Nothing is broken, but
the same tab can be worded differently on different types, and a client learns the Studio
by pattern. Worth aligning when one of those files is next touched — not worth a change
of its own.

### E4 · The same SEO object carries different help text on different types — **Low**

`page.ts` declares `seo` inline with a description; `post.ts` uses `seoField()`, which
does not set one. So the SEO tab explains itself on a page and not on an article. Same
root cause as E1: `page` sits outside the shared helper layer.

---

## Schema evolution

### S1 · The `toSlug` duplication is documented backwards, and the standing instruction not to merge rests on a false premise — **High**

`shared/editorial-guardrails.ts` states, of itself and `shared/slug-field.ts`:

> This one slugifies heading text into in-page anchors. The other generates document
> slugs. They happen to share an algorithm; they do not share a contract.

WP4's handoff repeats it, and it is carried forward as a standing instruction into every
session that touches the schema.

**Traced against actual usage, the roles are inverted:**

| | `slug-field.toSlug` | `editorial-guardrails.toSlug` |
|---|---|---|
| Signature | `(input, maxLength = 96)` — **parameterised** | `(input)` — hardcoded 64 |
| Document slugs | `post` · `person` · `category` · `product` · `productCategory` · `docPage` | `page`, and nothing else |
| Heading anchors | **`docs/doc-headings.ts`**, called as `toSlug(text, 64)` | none |

The anchor contract the guardrails copy claims to serve is served by the *other* function,
at exactly the length the guardrails copy hardcodes. There are not two contracts. There is
one parameterised function that already satisfies both, and one hardcoded duplicate with a
single consumer.

**Merging is safe, and safer than leaving it.** The stated risk — "unifying them silently
changes the slug generated for any title longer than 64 characters, and a changed slug on
a live document is a dead URL" — does not apply:

- Slugs are generated **only** when an editor clicks Generate. Sanity never re-slugifies
  stored content, so no existing document changes.
- The change is a **loosening**, 64 → 96. No existing slug becomes invalid, and
  `describeSlugProblem`'s length message relaxes rather than tightens.
- The affected type is `page`, and only for titles over 64 characters generated *after*
  the change.

**Recommendation:** delete `toSlug`, `slugifySegment`, `describeSlugProblem` and
`isSlugUnique` from `editorial-guardrails.ts`, and move `page.ts` onto `slugField()`. That
is one change that closes E1, E2, E4 and S1 together.

**Correct the record in three places** or the false premise outlives the code: this file,
`editorial-guardrails.ts`'s comment, and WP4's handoff in `effizien-system`.

### S2 · `page` is the base type every archetype inherits, and the one outside the shared layer — **Medium**

E1–E4 and S1 are all the same structural fact. `page.ts` and `home-page.ts` were written
against a different set of helpers than everything around them.

This matters more going forward than it does today. New archetypes are built by copying
the pattern of an existing type — and the catalogue and docs bundles copied `post`, which
means they inherited the *good* path. But `page` is what a developer opens first when
asked "how does a page work here", and it is the one that teaches the wrong pattern.

**Fix by moving `page` onto the shared helpers, not by documenting the difference.**

---

## What was checked and found sound

A review that lists only problems is not calibrated. These were examined specifically and
hold up:

- **The error/warn policy in `editorial-guardrails.ts` is applied consistently.** Errors
  fire on things that break something the editor cannot see and can fix from inside the
  document; warnings on things that render correctly but badly. The distinction survives
  every document type checked.
- **Accessibility is enforced in the model rather than by review.** `mediaImage` requires
  alt with an explicit decorative escape hatch; heading levels are derived from section
  position and never stored, so reordering cannot produce a level skip; the logo cannot be
  marked decorative.
- **The archetype switch works and its failure mode is documented.** Link targets and
  page-builder blocks are contributed by name, not import, which is what makes the switch
  a one-line change rather than a merge.
- **The singleton mechanism is complete.** All three parts — pinned `_id`,
  `newDocumentOptions`, `document.actions` — are present and driven by one list. Any one
  missing would make the guarantee hollow.
- **Reference integrity.** `disableNew` on the link picker prevents orphan drafts;
  `ROUTABLE_TARGET_FILTER` keeps unaddressable documents out of pickers.
- **`redirect` detects self-loops, two-step loops and chains**, with the first two
  blocking and the third advisory. Correct split.
- **i18n seams are marked at each site that would need changing** — slug uniqueness,
  singleton ids, field-level vs document-level localisation — rather than in one document
  nobody rereads.

---

## Recommended order

1. **E1 + S1 together** — move `page.ts` onto `slugField()`, delete the duplicate slug
   helpers, correct the comment and the WP4 handoff. One change, four findings.
2. **E3, E4** — align when those files are next touched. Not worth their own change.
3. **S2** — resolved by (1); keep it in mind when a fourth archetype is added.

Nothing here blocks a client build. E1 is the one that costs real money on a replacement
site, and it costs it silently.

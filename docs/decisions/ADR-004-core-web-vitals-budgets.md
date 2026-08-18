# ADR-004 — Core Web Vitals budgets are set to the standard, not to current performance

Date: 2026-08-17 · Status: **Accepted**

## Context

WP6 adds Lighthouse CI with Core Web Vitals budgets. `lighthouserc.json` is JSON and
cannot carry comments, so the reasoning lives here.

The budgets are enforced while the site renders **route shells** — a title, an `h1` and a
paragraph. The page-builder sections arrive in WP12. Every metric is therefore trivially
green today, which creates an obvious and wrong temptation: set the budgets near what the
empty page currently achieves, because that is what a "tight" budget looks like.

There is also a question of scope. Lighthouse reports five categories. Two of them
overlap work this project already does properly elsewhere: its accessibility category is
axe-core under the hood, and axe is already run directly by chunk 2 with a WCAG 2.2 AA
tag filter; its SEO category is a shallow subset of what `docs/runbooks/seo-geo-audit.md`
checks.

## Decision

**Budget against Google's published "good" thresholds, not against measured performance.**

| Metric | Budget | Severity |
|---|---|---|
| Largest Contentful Paint | ≤ 2500 ms | error |
| Cumulative Layout Shift | ≤ 0.1 | error |
| Total Blocking Time | ≤ 200 ms | error |
| First Contentful Paint | ≤ 1800 ms | warn |
| Speed Index | ≤ 3400 ms | warn |

**Total Blocking Time stands in for INP.** Interaction to Next Paint is a *field* metric —
it needs a real person interacting with the page, and Lighthouse's lab run has nobody to
interact. TBT is the accepted lab proxy. A client asking why their CrUX report shows INP
and CI does not is asking a good question with this answer.

**Performance category only.** One tool per concern: axe owns accessibility, the WP5
audit runbook owns SEO, Lighthouse owns performance. Two tools reporting on the same
thing produce contradictory signals and an argument about which to believe.

**Three runs, median.** A single Lighthouse run on a shared CI runner varies by hundreds
of milliseconds depending on what else the machine is doing. One run would make this the
flakiest check in the suite, and a flaky gate gets disabled.

**Desktop preset.** The mobile preset applies aggressive CPU and network throttling,
which is more realistic and much noisier on a shared runner. Mobile is where real users
are, so this is a genuine gap — see the revisit trigger.

## Consequences

**Easier.** The budgets mean the same thing before and after WP12: they encode the target
rather than the status quo. When real content lands, a failure is a real regression
against a standard, not a drift from an arbitrary baseline. Nothing needs re-baselining
downward.

**Harder, and knowingly accepted:**

- **The gate is currently slack.** An empty page passes these by an enormous margin, so
  today they catch nothing. That is the accepted cost of running WP6 before WP12, already
  recorded in `03-BUILD-PLAN.md`, and it is why chunk 1's unit tests are the part of this
  work package that pays immediately.
- **A regression *within* the budget is invisible.** If WP12 takes LCP from 300 ms to
  2400 ms, this passes. It is a floor, not a ratchet.
- **Desktop-only measurement understates real-world experience**, since most visitors to
  these clients' sites are on phones.
- **These numbers are lab measurements of a machine with no users.** They predict field
  Core Web Vitals; they do not measure them. Only CrUX and Search Console do, and only
  after real traffic. Do not show a client a green Lighthouse run as evidence their site
  performs well for their visitors.

## Revisit trigger

**Any** of:

1. **WP12 ships the renderer.** Re-run against real content and check the headroom. If
   real pages sit close to a budget, the budget is doing its job; if they still pass by a
   factor of ten, consider tightening toward observed-good — but only then, with data.
2. **A client's field Core Web Vitals in Search Console disagree with CI.** That is the
   signal that the desktop-only, lab-only measurement has drifted from reality, and the
   moment to add the mobile preset.
3. **The suite becomes flaky** — intermittent failures with no code change. Raise
   `numberOfRuns` before loosening a budget; a wider sample is the honest fix and a looser
   threshold is the tempting one.

---

## Revisit trigger 1 fired — 2026-08-18, WP12 chunk 6

The renderer shipped, so the budgets were re-run against real content: page-builder
pages, an article body, images, and the full block library. Medians of three runs,
desktop preset, on a developer machine.

| Page | LCP | CLS | TBT | FCP | Speed Index |
|---|---|---|---|---|---|
| `/` | 645 ms | 0.000 | 0 ms | 211 ms | 343 ms |
| `/pricing` | 512 ms | 0.000 | 0 ms | 212 ms | 212 ms |
| `/blog/how-long-a-flat-roof-lasts` | 518 ms | 0.000 | 0 ms | 212 ms | 212 ms |

**The budgets are unchanged, and that is the decision rather than an omission.**

The trigger asked whether real pages sit close to a budget or still pass by a factor of
ten. They sit at roughly **4–5× headroom on LCP** and 8–16× on the warn-level metrics —
mixed, and not the clear-cut "tighten it" case the trigger described. Three reasons not
to tighten anyway, all of which were the original argument:

- **These are localhost numbers on a fast machine.** No network latency, no CDN, no real
  round trip for images. Production on Vercel, serving `cdn.sanity.io` to a phone, is a
  different measurement, and the desktop-only caveat above still applies.
- **The content is still thin.** One image per page, short copy. A client site with a
  dozen images will be slower, and a budget tightened against this dataset would fail on
  content that is not a regression.
- **Tightening reintroduces exactly what this ADR rejected**: budgeting against the status
  quo rather than against the standard, so a failure means "drifted from an arbitrary
  baseline" instead of "worse than good".

**CLS is 0.000 and TBT is 0 ms on every page, and neither is luck.** CLS is zero because
`<SanityImage>` requires an explicit width and derives height from the asset id, so every
image reserves its space before it loads. TBT is zero because the rendered pages ship
essentially no client JavaScript — the FAQ block uses `<details>` rather than a client
component, which ADR-007's sibling decision in WP12 chunk 3 chose for other reasons and
which shows up here as well. Budgeting either at its observed value would fire the moment
someone adds a legitimate interactive component.

**The URL list is unchanged too.** Three pages still cover the three rendering paths: a
page-builder page with a hero image, a page-builder page with a disclosure block, and an
article body. Adding the newer pages would lengthen the slowest job in CI — Lighthouse
already sets the wall clock — for coverage of the same three paths.

Recorded here rather than in a new ADR because the decision did not change. The trigger
was checked, with data, and the answer held.


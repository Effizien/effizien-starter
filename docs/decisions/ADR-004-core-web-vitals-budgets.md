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

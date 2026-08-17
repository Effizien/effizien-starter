# Accessibility audit — WCAG 2.2 AA

Run before launch, and again after any change to navigation, forms or the page builder.

This becomes a Claude Code skill in WP8, which is why every check states its **expected
output**. A check an agent cannot evaluate is a check nobody runs twice.

**Four of the sections below are already automated and run on every pull request.** They
are listed so the audit is a complete picture, not so they are re-run by hand — §1 is a
one-line confirmation, and the audit's real work starts at §3.

```bash
export SITE=https://example.com
```

---

## 1 · What CI already covers

| Check | Where | Confirm by |
|---|---|---|
| axe-core, WCAG 2.2 AA tags, 6 routes | `e2e/accessibility.spec.ts` | The **Accessibility** job is green |
| Exactly one `h1`, one `main`, per route | same | same |
| Heading derivation rules | `heading-outline.test.ts` + the contract test | The **Typecheck, lint, test, build** job is green |
| Colour contrast, token pairs | `pnpm tokens` | The token build gates AA contrast and fails below it |
| Core Web Vitals | `lighthouserc.json` | The **Core Web Vitals** job is green |

```bash
gh run list --branch main --limit 1
```

**Expected: all four jobs `success`.**

> ⚠️ **CI reports; it does not block a merge.** A red run does not stop anything — see
> `docs/decisions/ADR-003-ci-is-advisory.md`. So "the last run was green" is a claim about
> the last run, not about `main`. Check the run for the commit you are auditing.

## 2 · What automation cannot tell you

**axe-core catches roughly 30–40% of real barriers.** A green run means no
machine-detectable violations. It cannot judge whether alt text is accurate, whether a
heading describes what follows it, whether focus order makes sense, or whether an error
message arrives at a useful moment.

**Everything below this line is the other 60–70%.** If the audit stops at §1, it has
verified the easy third and reported it as the whole.

## 3 · The manual pass

- [ ] **`docs/runbooks/screen-reader-protocol.md` completed**, 25 minutes
- [ ] Result recorded with date, operator, browser + screen reader, and a decision against
      every failure — fixed, accepted with a reason, or deferred with a date

**A tick with no record is not a pass.** It cannot be audited and cannot be handed over.

## 4 · Content quality — the checks only a human makes

The schema *requires* alt text (`mediaImage`, with a decorative escape hatch) and *warns*
on length. Neither can judge quality. Sample 5–10 images and 10 links from real content:

- [ ] **Alt text describes the content and its point**, not the file. "Two colleagues
      reviewing printed brand guidelines", not "IMG_4821" and not "image".
- [ ] **Decorative images are marked decorative**, so they stay silent.
- [ ] **Alt text does not repeat the caption** word for word — a screen reader user hears
      both.
- [ ] **Link text makes sense read aloud on its own.** Screen readers list links out of
      context; four links all saying "Read more" are indistinguishable in that list.
- [ ] **Headings describe what follows.** "Section" and "More" are valid and useless.
- [ ] **Nothing is communicated by colour alone** — a red asterisk, a green "in stock", a
      status dot. **1.4.1**, and the most frequently missed AA criterion in content.

## 5 · WCAG 2.2's new criteria

New in 2.2 and poorly covered by every automated tool, which is why they get their own
section rather than being folded into the manual pass.

- [ ] **2.4.11 Focus Not Obscured.** Tab backwards up a long page. A sticky header must
      not cover the focused element.
- [ ] **2.5.7 Dragging Movements.** Anything draggable has a non-drag alternative.
- [ ] **2.5.8 Target Size (Minimum).** Clickable things are ≥ 24×24 CSS px with adequate
      spacing. Footer icon rows are the usual offender.
- [ ] **3.2.6 Consistent Help.** If help, contact or chat appears on multiple pages, it is
      in the same place on each.
- [ ] **3.3.7 Redundant Entry.** No form asks again for information already given in the
      same flow.
- [ ] **3.3.8 Accessible Authentication.** No cognitive test — no puzzle, no
      transcription — without an alternative. Relevant the moment a client wants a login.

## 6 · Zoom, reflow and motion

- [ ] **400% zoom** at 1280px wide, or a 320px viewport: nothing lost, **no horizontal
      scrolling**. **1.4.10.** Fails most often on tables and code blocks.
- [ ] **200% text-only zoom**: no clipping or overlap. **1.4.4.**
- [ ] **`prefers-reduced-motion` honoured** by every animation and transition.

```bash
# Anything that animates should be inert with this on.
# macOS: System Settings → Accessibility → Display → Reduce motion
```

- [ ] **Nothing auto-plays, moves or flashes for more than five seconds** without a
      pause control. **2.2.2.**

## 7 · Structure and semantics

Mostly covered by §1, but these are the ones worth a human's eye:

- [ ] `<html lang>` set, and **correct for the content's actual language**
- [ ] Landmarks unique and labelled where repeated — two `nav`s need distinguishing names
- [ ] **A skip link, first in the tab order**, visible on focus
- [ ] Tables have real headers; layout tables do not exist
- [ ] `<button>` for actions, `<a>` for navigation — a `div` with `onClick` is a defect

## 8 · The client deliverable

> ⚠️ **Not written yet.** Both templates are WP6 chunk 6. This section is here so the gap
> is visible rather than assumed filled — an audit that silently omits the deliverable is
> how a launch reaches the day before with nothing to hand over.

- [ ] **Accessibility statement published**, from
      `docs/templates/accessibility-statement.md`, naming the standard, the date, the
      known gaps and a contact route
- [ ] **VPAT/ACR completed** if the client sells to government, education or enterprise
      procurement — see `docs/templates/`

---

## What this audit does not establish

Named so a pass is not mistaken for something larger.

- **It is not a legal compliance opinion.** WCAG conformance and legal obligation under
  the ADA, the EAA or the Equality Act are related and not identical. Do not tell a client
  they are "compliant"; tell them the site meets WCAG 2.2 AA to the extent this audit
  tests, and name what was not tested.
- **It is not testing by disabled users.** A sighted developer running a 25-minute
  protocol catches gross failures and misses friction a daily screen reader user would
  find in minutes. If accessibility is material to the client's audience or their legal
  exposure, testing by people who use assistive technology daily is a separate,
  worthwhile line item.
- **It covers the pages sampled**, not every page. A page builder means every page is a
  different arrangement; a clean sample is evidence, not proof.
- **It is a point in time.** The next content edit can break it — an editor can upload an
  image with useless alt text an hour after launch. That is what the schema's guardrails
  are for, and they are a floor rather than a guarantee.

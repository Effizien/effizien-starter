# Runbooks

Procedures someone can follow under pressure, at 2am, without having built the site.

A runbook is not documentation of how something works — it is an ordered list of commands
and checks with expected output, written so the reader does not have to reason.

**Complete as of WP9.** This file used to carry a "partly built" banner listing what was
missing; every row below now exists. It is kept as the index rather than deleted, because
a directory listing does not tell you which runbook to open.

## Contents

| Runbook | Covers |
|---|---|
| `rebrand.md` ✅ | Changing a client's brand colours through the token pipeline |
| `search-console-and-analytics.md` ✅ | Wiring GSC and GA4 on launch day, and the week-one verification |
| `seo-geo-audit.md` ✅ | Pre-launch and post-launch search/AI visibility audit. Becomes a skill in WP8 |
| `accessibility-audit.md` ✅ | WCAG 2.2 AA audit. Covers what CI does not — the other 60–70%. Becomes a skill in WP8 |
| `screen-reader-protocol.md` ✅ | The 25-minute manual pass, NVDA/VoiceOver. Referenced by the audit and required at every launch |
| `pre-launch-checklist.md` ✅ | The orchestrator. Everything true before a domain points here — technical, content, SEO, a11y, legal — then a go/no-go |
| `deploy.md` ✅ | Normal deploy, what a healthy build looks like, how to verify after |
| `rollback.md` ✅ | Reverting a bad production deploy — Vercel *Promote to Production* on the last good build, not a revert-and-rebuild |
| `dns-cutover.md` ✅ | Domain switch on launch day, TTL lowering beforehand, verification, and the abort path |
| `content-restore.md` ✅ | Recovering deleted or wrongly-edited content. **Read the retention section before you need it — it is three days on the Free plan** |
| `incident.md` ✅ | Site down: what to check first and in what order, who to contact, how to communicate |

## Writing one

- Number every step. One action per step.
- State the expected result of each step, so a reader knows when it went wrong.
- Put the rollback path *before* the risky step, not at the end.
- Name who to call when it fails, with the escalation order.
- Test it by having someone who did not write it follow it exactly.

**A runbook nobody has rehearsed is a wish.** Two here are written but unrehearsed, and
both say so in place:

- **`dns-cutover.md`** should be walked through on a throwaway domain before a client's
  live one. Ten pounds and an hour.
- **`content-restore.md` §2**, recovering a deleted document, could not be tested without
  deleting real content. The history API it uses was verified against a live document;
  the deletion path was not.

## Where to start

| Situation | Open |
|---|---|
| Getting ready to launch | `pre-launch-checklist.md` |
| Launch day, moving the domain | `dns-cutover.md` |
| Shipping a change | `deploy.md` |
| Just shipped something bad | `rollback.md` |
| An editor lost content | `content-restore.md` |
| The site is down | `incident.md` |

# Runbooks

Procedures someone can follow under pressure, at 2am, without having built the site.

A runbook is not documentation of how something works — it is an ordered list of commands
and checks with expected output, written so the reader does not have to reason.

> **Not yet built.** The launch and handoff kit — pre-launch checklist, DNS cutover with
> rollback, post-launch monitoring — is WP9. This file records what belongs here so the
> gap is visible rather than assumed filled.

## Expected contents

| Runbook | Covers |
|---|---|
| `deploy.md` | Normal deploy, what a healthy build looks like, how to verify after |
| `rollback.md` | Reverting a bad production deploy — Vercel *Promote to Production* on the last good build, not a revert-and-rebuild |
| `dns-cutover.md` | Domain switch on launch day, TTL lowering beforehand, verification, and the abort path |
| `content-restore.md` | Recovering deleted or wrongly-edited content from Sanity's history |
| `incident.md` | Site down: who to contact, what to check first, how to communicate |

## Writing one

- Number every step. One action per step.
- State the expected result of each step, so a reader knows when it went wrong.
- Put the rollback path *before* the risky step, not at the end.
- Name who to call when it fails, with the escalation order.
- Test it by having someone who did not write it follow it exactly.

**A runbook nobody has rehearsed is a wish.** The DNS cutover in particular should be
walked through on a throwaway domain before it is used on a client's live one.

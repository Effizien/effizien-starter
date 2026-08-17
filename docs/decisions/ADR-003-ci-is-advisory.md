# ADR-003 — CI reports; it does not block a merge

Date: 2026-08-17 · Status: **Accepted**

## Context

WP6's stated output is *"a CI gate that fails the build"*. The workflow in
`.github/workflows/ci.yml` runs three jobs — typecheck/lint/test/build, the Studio build,
and the axe-core accessibility suite — on every pull request and every push to `main`.

Making those **required status checks**, which is what turns a run into a gate, needs
either branch protection or a repository ruleset. GitHub refuses both on a private
repository under a free organisation plan. Verified directly rather than assumed:

```
PUT  /repos/Effizien/effizien-starter/branches/main/protection  → 403
POST /repos/Effizien/effizien-starter/rulesets                   → 403
"Upgrade to GitHub Pro or make this repository public to enable this feature."
```

Three ways out existed:

1. **Make the repository public.** Free and immediate. The repository is designed to be
   cloned, and nothing secret is in it by construction — credentials live in `.env.local`
   and Vercel, with `.gitignore` and `.claude/hooks/secret-guard.mjs` guarding that.
2. **Pay for GitHub Team.** Unlocks rulesets on private repositories.
3. **Accept report-only.**

## Decision

**Accept report-only, for now.**

Publishing was not rejected — it was **deferred pending a security audit of the
repository**. The operator's reasoning: the repository has never been reviewed with
publication in mind, and "nothing secret is in it by construction" is a claim about the
design, not a finding about the history. That distinction is correct, and it is the same
one this project applies everywhere else: a stated guarantee is not a verified one.

Paying for Team was rejected as solving the symptom at a recurring cost, when the
condition that removes the restriction entirely is one audit away.

## Consequences

**Easier.** No cost. No exposure of a repository whose history has not been reviewed.
The workflow still runs on every PR, so the information exists — it simply requires a
human to read it.

**Harder, and the part that matters:**

- **A red pull request can be merged.** Nothing prevents it. Every claim WP6 makes about
  enforcement is currently a claim about a signal, not a barrier.
- **The failure mode is believing otherwise.** A gate you know is advisory is a
  reasonable trade for a solo operator who reads his own pull requests. A gate you
  *believe* is blocking and is not is worse than no gate, because it licenses skipping
  the manual check the advisory version depends on. This ADR and the banner at the top of
  `ci.yml` exist to make that impossible to forget.
- **WP9 must not encode this as a gate.** Its launch checklist will want to assert that
  accessibility failures cannot reach production. Today they can.
- **This is the same shape as two defects this project has already had** — a `redirect`
  document type that did nothing until WP5, and `save-exact` declared in three places and
  enforced in none. Stated capability, absent mechanism. Writing it down is the whole
  difference.

## Revisit trigger

**Either** of, whichever comes first:

1. **A security audit of the repository completes clean**, at which point make it public
   and enable required status checks — the free path, and the one already intended. The
   audit needs to cover at minimum: the full git history scanned for credentials (not
   just the working tree — a rotated-but-committed token is still a leak), `.env.example`
   confirmed to hold no real values in any revision, the secret-guard hook's actual
   coverage versus its claimed coverage, and a dependency audit.
2. **A second person gains write access.** At that point "I read my own pull requests"
   stops being a control at all, and report-only stops being an acceptable trade
   regardless of the audit's status. Pay for Team that day if the audit has not happened.

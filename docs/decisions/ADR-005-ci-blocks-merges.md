# ADR-005 — CI blocks merges; the repository is public

Date: 2026-08-17 · Status: **Accepted** · **Supersedes ADR-003**

## Context

ADR-003 recorded that CI reported rather than blocked, because required status checks need
branch protection and GitHub refuses that on a private repository under a free
organisation plan. It named two revisit triggers. **Trigger 1 fired the same day.**

The audit it was waiting on is `docs/reviews/pre-publication-security-audit.md`. Twelve
checks across the full history on every branch: no `.env` file but `.env.example` ever
tracked, no real value in any revision of it, no credential format in any commit, the real
Sanity project ID absent from all history, nothing tracked despite being gitignored, and
no personal identifiers.

It took about fifteen minutes. ADR-003 framed it as a project; it was an afternoon's worry
and a quarter-hour of work, which is worth recording because the same misjudgement will
recur.

## Decision

**The repository is public, and all four CI jobs are required status checks on `main`.**

```
Typecheck, lint, test, build
Studio build
Accessibility (axe-core)
Core Web Vitals (Lighthouse)
```

`strict: true` — a branch must be up to date with `main` before merging, so two PRs that
are individually green cannot merge into a combination neither tested.

**`enforce_admins` is deliberately off.** A solo operator locked out of his own `main`
branch during a launch is a worse failure than a skipped check. This is the one remaining
way past the gate, and it is an escape hatch by design rather than a hole. It becomes the
wrong setting the moment a second person has write access — the same threshold ADR-003's
trigger 2 named.

## Consequences

**Easier.** WP6's stated output is now true: the gates block. WP9's launch checklist can
assert that an accessibility or Core Web Vitals failure cannot reach `main` without a
deliberate override. Publishing also switched on GitHub's own secret scanning, free on
public repositories, which now watches every future push.

**Harder, and knowingly accepted:**

- **The working method is public** — handoffs, ADRs, review documents, and the reasoning
  in every code comment. A business decision rather than a security one, and arguably an
  asset given what the narrative workstream is building.
- **The two sibling repositories are named** in `docs/decisions/README.md` and
  `docs/reviews/wp4-content-model.md`. Their existence is now public; their contents are
  not. **`effizien-system` was not audited and stays private.**
- **A green `main` is now load-bearing.** People will rely on it, which is the point, and
  which means an admin override is a more serious act than it was when the checks were
  advisory. Use it and say so in the PR.
- **The audit is a point in time.** It says nothing about a commit made tomorrow. The
  secret-guard hook and `.gitignore` carry it forward, and both describe themselves as
  speed bumps rather than boundaries.

## Revisit trigger

**A second person gains write access.** At that point turn `enforce_admins` on: the
override exists because one person's judgment is the only thing behind it, and that stops
being true the moment it is not one person.

Also revisit if **a required check becomes flaky**. The temptation will be to drop it from
the required list, which silently returns that gate to ADR-003's world. Fix the flake, or
remove the check deliberately and record why — do not let it decay.

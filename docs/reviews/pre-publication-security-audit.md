# Pre-publication security audit

2026-08-17 · Scope: **`effizien-starter` only** · Verdict: **safe to make public**

Run to satisfy revisit trigger 1 of `docs/decisions/ADR-003-ci-is-advisory.md`. Making the
repository public is the free path to required status checks, and the question this audit
answers is narrow: **is there anything in this repository, in any revision, that should
not be readable by anyone?**

---

## The threat model, stated first because it is usually got wrong

The instinct is to ask "what are the chances someone finds it?". For a human browsing
GitHub, effectively zero. That is the wrong question.

**Automated scanners watch the public-repository firehose continuously.** Published
experiments planting honeypot credentials in public repositories see them used within
minutes. So discovery is not probabilistic — it is automatic and immediate.

Which makes the real question: **is there anything to find?** If not, publication is safe
regardless of who is looking. Publishing also switches on GitHub's own secret scanning,
free on public repositories, which then works in your favour.

---

## Findings

| # | Check | Result |
|---|---|---|
| 1 | Any `.env` file ever committed, any revision | **Only `.env.example`.** `.env.local` never tracked |
| 2 | `.env.example` contents across every revision | **No real value in any revision** |
| 3 | Credential patterns across every diff, all branches | **3 hits, all in the hook's own ruleset** — see below |
| 4 | Sanity-format tokens (`sk…`) anywhere in history | **None** |
| 5 | Long secrets assigned to `token`/`secret`/`password`/`apiKey` | **None** |
| 6 | Real Sanity project ID committed | **None** — 0 occurrences in all history |
| 7 | Files tracked despite being gitignored | **None** |
| 8 | Personal identifiers — employer, email, phone | **None** |
| 9 | Dependency advisories | 14 app / 11 studio — **all transitive dev tooling**, see below |
| 10 | `secret-guard` claimed vs actual coverage | **Claims match reality**, and understate it slightly |

### On finding 3

The only matches are inside `.claude/hooks/patterns.mjs` — the secret-guard hook's own
detection ruleset, which necessarily contains example patterns for the things it detects.
Not a leak.

Worth noting how this was confirmed: the hook **blocked the command written to
investigate it**, because that command contained a literal `sk_live_` string. It cannot
distinguish a fixture from a real key, which is the correct bias for a speed bump and
worth knowing before it surprises someone.

### On finding 9 — dependency advisories do not bear on publication

They are public information about public packages. Publishing the repository reveals
nothing an attacker could not already learn from `package.json` on any deployed site.
They are listed here for completeness and should be handled on their own schedule.

Every high-severity item is a **transitive development dependency**:

- `tmp`, `js-yaml` ← `@lhci/cli` (Lighthouse CI, `devDependency`)
- `undici`, `js-yaml` ← `@sanity/cli` ← `sanity`

**`sanity` is not installed in the app at all.** It is a peer of `next-sanity` that
`pnpm-workspace.yaml` deliberately ignores, so the whole `@sanity/cli` branch is a
declared path that does not resolve in the app's tree. None of these reach the browser
bundle or the production server. Renovate's weekly PRs are the right mechanism; nothing
here is urgent.

### On finding 10 — the hook describes itself accurately

`.claude/rules/secrets.md` claims the hook blocks on `Write`, `Edit` and `Bash`, and
states its own limits plainly: *"a speed bump on one path, not a boundary — it cannot see
through `$(…)`, heredocs, `base64 -d`, or a script invoked by path."*

Verified: matchers are `Write`, `Edit`, `Bash` **and `NotebookEdit`**, so actual coverage
slightly exceeds the claim. Twenty pattern families — Sanity, GitHub, AWS, Stripe, Vercel,
Anthropic, OpenAI, Google, Statsig, Slack, Discord, Resend, JWT, PEM — plus three
git-command guards for `git add` of env files, force-adding ignored files, and
`git rm --cached` of gitignored paths.

**This is the rare case of a security control that does not overclaim.** Given how much of
this project's history has been "stated capability, absent mechanism", it is worth
recording that this one is the opposite.

---

## Verdict

**`effizien-starter` is safe to make public.** Nothing in any revision on any branch
should be withheld.

Two consequences to accept knowingly:

- **The working method becomes visible** — handoffs, ADRs, review documents, and the
  reasoning in every code comment. That is a business decision rather than a security one,
  and given the narrative workstream is building a story about *how* the work is done, it
  is arguably an asset.
- **Sibling repositories are named** in `docs/decisions/README.md` and
  `docs/reviews/wp4-content-model.md`. That reveals `effizien-system` and
  `effizien-learning` exist. Harmless, but not nothing.

## What this audit did **not** cover

- **`effizien-system` was not audited and should stay private.** It holds positioning,
  pricing thinking, client-facing strategy and the narrative work. Different repository,
  different question, and the answer is probably no.
- **`effizien-learning` was not audited.** Out of this workstream's write boundary.
- **This is a point-in-time result.** It says nothing about a commit made tomorrow. The
  hook and `.gitignore` are what carry it forward, and both are speed bumps rather than
  guarantees.

## Next — done 2026-08-17

The repository was made public and required status checks enabled the same day. All four
CI jobs now block a merge on `main`. ADR-005 supersedes ADR-003 and records what changed.

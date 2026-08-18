# ADR-008 — Node is pinned to one major, and the check that enforces it is read

Date: 2026-08-18 · Status: **Accepted**

## Context

Three places named a Node version and they were free to disagree:

| Where | Said | Read by |
|---|---|---|
| `.nvmrc` | `22` | CI, via `node-version-file` |
| `package.json` → `engines.node` | `>=20.9.0` | Vercel, to choose a runtime |
| `studio/package.json` → `engines.node` | `>=20.9.0` | the Studio's own installs |

CI therefore tested on 22 while Vercel read a range and picked its own default. A failure
specific to one major could pass every required check and ship. WP6's handoff named this
and deliberately left it: *"Worth deciding deliberately; it did not belong in a CI chunk."*

**The enforcement was already absent, which was not known until it was checked.**
`.npmrc` carries `engine-strict=true`, and **pnpm 11 does not read it** —
`pnpm config get engine-strict` returned `undefined`. The range was decorative: nothing
refused an install on the wrong major.

This is the third instance of the same defect in this project. `save-exact` was declared
in three places and enforced in none until WP6 moved it to `pnpm-workspace.yaml`; a
`redirect` document type did nothing until WP5; a stega regex matched characters the
encoder never emits. **Stated capability, absent mechanism.** WP6 moved the one setting it
had tripped over and left its neighbour in the same file, which is how this survived.

## Decision

**Pin `engines.node` to `22.x`** in both `package.json` and `studio/package.json`, matching
the `.nvmrc` that CI already uses.

**Move the strictness setting to `pnpm-workspace.yaml` as `engineStrict: true`**, where
pnpm 11 reads it. `.npmrc` keeps its line — it is still correct for npm and for anyone
running a different package manager — but it is no longer what this repository relies on.

A single major rather than a range, for the same reason dependencies are pinned exactly:
version drift between client sites is the problem this starter exists to prevent, and a
range means the version is chosen by whoever installs rather than by this file.

## Consequences

**Easier.** The three places agree, and cannot silently stop agreeing. Vercel now reads a
specific major instead of choosing. A Node bump becomes a deliberate edit to three files
in one commit, visible in a diff, rather than a platform default quietly moving underneath
a project.

**Verified rather than assumed.** With `engineStrict` in place, setting `engines.node` to
`20.x` on a machine running 22 fails the install with exit code 1 and
`ERR_PNPM_UNSUPPORTED_ENGINE`, naming both versions. Before this change the same mismatch
installed happily.

**Harder, and knowingly accepted:**

- **A contributor on another major cannot install until they switch.** That is the point,
  and the error names the expected version — but it is a hard stop rather than a warning,
  and someone will meet it.
- **The pin has to be maintained.** When 22 leaves maintenance this fails to build rather
  than drifting forward on its own. That is the trade: a loud, dated obligation instead of
  a silent one.
- **Vercel's own default has moved to a later major.** Pinning to 22 means deliberately not
  taking it. Correct while CI tests 22, and wrong the moment that stops being true — the
  two must move together.

## Revisit trigger

**Any** of:

1. **Node 22 leaves maintenance.** Bump `.nvmrc`, both `engines` fields and CI together,
   in one commit, and run the full suite before merging.
2. **Vercel stops offering 22.** The build fails outright; the fix is trigger 1, brought
   forward.
3. **A dependency requires a later major.** Same change, driven by the dependency rather
   than the calendar.

Whichever fires, the check to run first is `pnpm config get engine-strict`. If it ever
returns `undefined` again, the enforcement has been lost and the version numbers are
decoration.

# Runbook — rebrand a site

**Time: about an hour**, most of it spent deciding colours rather than applying them.

Applies when a client changes brand colours, corner treatment, or type. Not for a
redesign — a new layout is a build, not a rebrand.

## Before you start

- [ ] The new palette is agreed and written down as actual values, not a mood board.
- [ ] You know which **reference ramp** rungs the brand maps to. If the brand is a single
      hex, you need a ramp built from it first — a rebrand needs 11 rungs, not one colour.
- [ ] The site builds clean on `main`: `pnpm check`.

## Steps

**1. Update the Figma Variables — Reference collection only.**
Change the ramp values. Do not touch the Semantic collection: its aliases already point
at the right rungs, and repointing them is how a rebrand turns into a redesign.

*Expected:* the Figma file restyles itself. If something did not change colour, it was
hard-coded rather than aliased — fix that in Figma now, or it will keep drifting.

**2. Export and drop in.**
Export Variables to JSON and replace the files in `tokens/reference/`.

*Expected:* `git diff tokens/` shows changes in `reference/` only. **If `semantic/`
changed, stop** — either the export flattened the aliases, or someone edited tier 2. Both
mean the next rebrand will be a manual job.

**3. Rebuild.**

```bash
pnpm tokens
```

*Expected:* `✔ tokens.css written` followed by `✔ N contrast pairs pass WCAG 2.2 AA`.

**If the contrast gate fails**, the new palette is not accessible at those pairings.
Adjust the *ramp* — usually by darkening the rung `muted-foreground` resolves to — and
rebuild. Do not repoint the semantic token, and do not relax the threshold: WCAG 2.2 AA
is a hard constraint on this project, and a rebrand is exactly when it quietly breaks.

**4. Look at it.**

```bash
pnpm dev
```

Check both modes, and tab through the page to confirm the focus ring is still clearly
visible against the new background. The gate proves the ratios; it cannot tell you the
brand looks right.

**5. Full gate, then ship.**

```bash
pnpm check
```

Commit `tokens/` and `src/app/tokens.css` together. **That diff is the rebrand** —
reviewable, revertable, and the reason this pipeline exists.

## Rollback

`git revert` the commit and run `pnpm tokens`. Because the change is confined to token
files, nothing else in the codebase has to be touched — which is the whole point of
keeping components on semantic names.

## If it took much longer than an hour

Something is hard-coded. The usual culprits, in order of likelihood:

- a hex value inline in a component's class list
- a colour in `globals.css` outside the generated `tokens.css`
- a Figma Semantic variable holding a raw colour instead of an alias
- an image or SVG with the old brand colour baked in — these will never be caught by the
  token pipeline, so list them in `docs/content-model.md` as assets needing manual review

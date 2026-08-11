# Design tokens

Figma Variables → JSON → `src/app/tokens.css`. Run `pnpm tokens` after any change.

## The three tiers

The whole structure exists to make one thing true: **a rebrand is a change to tier 1
only.** Everything else is references.

| Tier | Directory | Named by | Example |
|---|---|---|---|
| 1 · Reference | `reference/` | what it **is** | `brand.500`, `radius` |
| 2 · Semantic | `semantic/` | what it's **for** | `primary`, `muted-foreground` |
| 3 · Component | `component/` | the component | `button.height.sm` |

**Name by purpose, never by value.** `color.action.primary` survives a rebrand;
`color.blue.500` becomes a lie the first time the brand changes to green. That is why
tier 2 exists at all — without it, every component hard-codes a palette position.

**Nothing outside `semantic/` may reference tier 1 directly.** A component pointing at
`--brand-500` is a component that cannot be rebranded.

Tier 2 names are deliberately identical to the ones shadcn/ui expects (`primary`,
`border`, `ring`, …), so there is no translation layer between tokens and components —
a mapping layer is just one more place for the two to drift apart.

## Modes

`semantic/light.json` and `semantic/dark.json` hold the same names with different
references, emitted as `:root` and `.dark`. **Every name must exist in both.** The build
fails otherwise: a token defined in one mode only is undefined under the other selector,
so the component silently inherits a value and the bug appears in one theme — surviving
any review done in the other.

## Getting tokens out of Figma

⚠️ **There is a manual export step, and it is not going away on this plan.** Figma's
Variables REST API is **Enterprise-only**; this project is on Pro, so tokens cannot be
pulled automatically.

The workflow:

1. In Figma, structure Variables in collections mirroring the tiers above:
   - **Reference** — one collection, raw ramps (`brand/50` … `brand/950`)
   - **Semantic** — one collection with two modes, *Light* and *Dark*, whose values are
     **aliases** to Reference variables, never raw colours
2. Export with a Variables-to-JSON plugin (Tokens Studio, or any DTCG exporter).
3. Drop the JSON into `reference/` and `semantic/`, keeping the `$value` / `$type` shape.
4. `pnpm tokens`
5. Commit. **The committed diff is the brand change** — which is exactly what WP3 asked
   for. The manual step costs a minute and buys a reviewable artifact.

If Figma variables are aliased properly in step 1, the exported semantic tokens arrive as
`{brand.500}` references and the tier separation survives the round trip. If they are
exported as flattened raw colours, the tiers collapse and every future rebrand becomes a
find-and-replace. **Check the export before committing it.**

## The contrast gate

`pnpm tokens` fails the build on any WCAG 2.2 AA contrast failure in the token set.

This is not belt-and-braces. Contrast is a property of a **pair**, and a rebrand changes
tier 1 while leaving tier 2 pointing at the same rungs — so the UI restyles itself, looks
entirely correct, and contrast moves underneath it. Swapping the neutral ramp for a blue
one of similar lightness took `muted-foreground` from **4.74:1 to 3.69:1**, a real AA
failure for body text, with nothing on screen announcing it.

Thresholds: **4.5:1** for text pairs, **3:1** for the focus ring (WCAG 1.4.11, non-text).
Translucent tokens are reported as skipped rather than guessed at — their real contrast
depends on what renders behind them, which the token set cannot know.

The oklch → sRGB conversion in `contrast.mjs` is Ottosson's OKLab transform, implemented
directly rather than pulled in as a dependency, and **verified channel-for-channel against
the browser's own colour engine**. An accessibility gate that lies is worse than no gate.

> The default focus `ring` was moved from `brand.400` to `brand.500` because shadcn's
> default fails 1.4.11 on white at **2.58:1**. Worth knowing if you compare this theme
> against upstream and wonder why it differs.

## When a check fails

Fix the **reference ramp**, not the semantic token. Pointing `muted-foreground` at some
arbitrary darker value fixes today's build and breaks again on the next rebrand — the
ramp is the thing a rebrand changes, so the ramp is where the fix belongs.

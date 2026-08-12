# AGENTS.md — [CLIENT NAME]

Canonical briefing for agents working in this repository. `CLAUDE.md` is a symlink to
this file. Keep it under ~200 lines — past roughly that many instructions, adherence
degrades. Longer material belongs in `.claude/rules/`.

> **Scaffolded from `effizien-starter`.** Replace every `[BRACKETED]` placeholder and
> delete this line. If a section still says `[TBD]`, that is a real gap, not a formality.

## What this site is

- **Client:** [CLIENT NAME]
- **Archetype:** [marketing | catalog | docs]
- **Purpose:** [what the site must do — sell, generate leads, inform, document]
- **Primary audience:** [who, and what they need to decide]
- **Who edits after launch:** [name, role, technical comfort] — this drives CMS guardrails
- **Production URL:** [https://…] · **Studio:** [https://<projectId>.sanity.studio]

## Structure — two apps, one repo

```
src/            Next.js App Router application
├── app/        routes; co-locate route-specific components
├── components/ shared components (ui/ is shadcn copy-in)
├── lib/        shared utilities
└── sanity/     env, client, live, image, token — the CMS boundary
studio/         standalone Sanity Studio (Vite, auto-updating, own deps)
docs/           decisions/ · content-model.md · runbooks/
prompts/        reusable prompts, versioned with the code
```

**Not a monorepo.** No pnpm workspace: `src/` and `studio/` are independent apps with
their own `package.json` and lockfile. Install both with `pnpm install:all`. Handing a
client a Turborepo when their site is one app is a bad handoff.

## Commands

| | |
|---|---|
| `pnpm install:all` | install app **and** Studio deps |
| `pnpm dev` | Next.js on :3000 |
| `pnpm studio` | Sanity Studio on :3333 |
| `pnpm check` | typecheck → lint → build. **Run before every commit.** |
| `pnpm typegen` | regenerate `sanity.types.ts` from schema + queries |
| `pnpm tokens` | rebuild `src/app/tokens.css` from `tokens/`; gates WCAG AA contrast |
| `pnpm studio:build` | production-build the Studio — the real check that the schema resolves |
| `pnpm lint:fix` | Biome autofix |

## Stack

Next.js 16 App Router · React 19 · TypeScript 6 strict · Tailwind v4 (CSS-first, there is
no `tailwind.config.js`) · shadcn/ui on **Radix** primitives · Sanity + GROQ + TypeGen ·
Biome · pnpm · Vercel.

**Versions are pinned exactly and `.npmrc` sets `save-exact`.** Do not introduce a caret
range. Version drift between client sites is the problem this starter exists to prevent.

## Creation-time conventions

These live here rather than in `.claude/rules/` on purpose: path-scoped rules only fire
when an agent **reads** a matching file, so they are silent at the exact moment a new
file is being written.

- **Secrets:** real values go in `.env.local` only. Reference as `process.env.NAME`.
  Never inline a credential; never pass one as a shell argument. `NEXT_PUBLIC_` is an
  *escalation*, not an exemption — Next inlines it into the browser bundle at build time.
- **New route** (`src/app/**/page.tsx`): export `metadata` or `generateMetadata`. One
  `h1`. Server Component unless it needs interactivity.
- **New component:** Server Component by default; `'use client'` only on the smallest
  leaf that needs it. Never import a server-only module into a client component.
- **New schema type** (`studio/schemaTypes/`): kebab-case filename, named export
  matching it, registered in `index.ts`. Model the content before writing the page.
  Prefer composing the existing `page` + page builder over adding a document type — a
  new type must have fields a generic page does not.
- **Archetype** is one line in `studio/archetype.ts`. Types belonging to one archetype
  never go in the base model: hardcoding `post` into the shared link targets is what
  made selecting another archetype fail with `Unknown type: post`.
- **Design tokens:** never hardcode a hex, spacing value, or font size. Edit `tokens/`
  and run `pnpm tokens` — `src/app/tokens.css` is generated. Only `tokens/semantic/` may
  reference the raw ramp; a component pointing at `--brand-500` cannot be rebranded.
- **shadcn components:** add with `--base radix`. The CLI's default base is now Base UI,
  which is the wrong primitive layer for this project.
- **After changing a GROQ query or schema:** run `pnpm typegen`.

## Hard constraints

Non-negotiable. If a request conflicts with one, say so before building.

- **Accessibility: WCAG 2.2 AA.** Semantic HTML first — a `div` with `onClick` is a
  defect. Keyboard reachable, visible focus, accessible name, meaningful `alt`.
  Automated checks catch ~30–40% of real barriers, so they are a floor, not proof.
- **SEO and GEO are designed in, never bolted on.** Metadata on every route, typed
  JSON-LD derived from the same data the page renders, canonical URLs absolute.
- **Performance budgets** apply to Core Web Vitals. Always give Sanity images an explicit
  width; the original asset can be several megabytes.
- **Never commit a secret.** Project IDs and dataset names are public by design; API
  tokens never are. The Sanity read token must be **Viewer**-scoped — `next-sanity` sends
  it to the browser in draft mode.
- **Redirect map is non-negotiable on a replacement site.** Every old URL maps to a new
  one or a deliberate 410. Losing search equity at launch is the most damaging and most
  preventable failure in this business.

## What NOT to do

- Don't add a dependency without justifying it. Lean, justified tooling over sprawl.
- Don't ship code from a Figma Make concept. Extract direction and tokens; build properly.
- Don't hand-edit `sanity.types.ts`, `schema.json`, or `src/app/tokens.css` — all generated.
- Don't add a `tailwind.config.js`. Tailwind v4 is configured in CSS.
- Don't relax `pnpm check` to get a build out. If types or lint fail, the code is wrong.
- Don't put site-specific context in Obsidian or Drive. It belongs in this repo.

## Where context lives

- **This repo is canonical** for anything describing *this site*.
- `docs/decisions/` — ADRs. Every material choice gets one, with a revisit trigger.
  A decision without a trigger calcifies.
- `docs/content-model.md` — schema map and editorial rules.
- `docs/runbooks/` — deploy, cutover, rollback.
- `HANDOFF.md` — kept current, not written the week before launch.
- Cross-project playbooks live in the operator's Obsidian vault; client-facing documents
  live in Google Drive. Link between them — never duplicate.

## Session protocol

Start by reading this file and confirming what you're working on. End by updating
`HANDOFF.md` if anything material changed, and writing a handoff note
(`prompts/handoff-note.md`).

If work would change a decision recorded in `docs/decisions/`, **stop and raise it**
rather than deciding it mid-build. Tooling sprawl never arrives as a decision; it arrives
as a reasonable-sounding suggestion at message 60 of a long session.

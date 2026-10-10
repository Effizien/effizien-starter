# AGENTS.md · [CLIENT NAME]

The briefing for agents working in this repository. `CLAUDE.md` is a symlink to this file. Keep it
under about 200 lines: past roughly that many instructions, adherence degrades, and longer material
belongs in `.claude/rules/`.

> **Created from `effizien-starter`.** Replace every `[BRACKETED]` placeholder and delete this
> line. A section that still says `[TBD]` is a real gap, not a formality. In the starter itself,
> this file is the template every site's briefing starts from.

## What this site is

- **Client:** [CLIENT NAME]
- **Archetype:** [marketing | catalog | docs]
- **Purpose:** [what the site must do: sell, generate leads, inform, document]
- **Primary audience:** [who, and what they need to decide]
- **The client's tools:** [what they run, such as Mailchimp, Shopify, HubSpot or Salesforce, and which connect to the site]
- **Who edits after launch:** [name, role, technical comfort]. This sets the CMS guardrails
- **Production URL:** [https://…] · **Studio:** [https://<studioHost>.sanity.studio, once `studioHost` is set and the Studio is deployed]

## The Effizien system

This site is deployed from `effizien-starter`, the foundation of the Effizien system. The system's
playbook is `effizien-system`: how Effizien works, its decisions, and the discovery behind this
site. Read `effizien-system/AGENTS.md` when the work touches a system decision, the starter itself,
or the discovery that produced this site. A session rooted here does not load it: add the directory
with `--add-dir ../effizien-system`, then read its briefing first.

The client's research report and context files: [WORKING FOLDER].

## Structure: two apps, one repository

```
src/            Next.js App Router application
├── app/        routes; route-specific components sit beside them
├── components/ shared components (ui/ holds the shadcn copies)
├── lib/        shared utilities
└── sanity/     env, client, live, image, token: the CMS boundary
studio/         standalone Sanity Studio (Vite, auto-updating, its own dependencies)
docs/           decisions/ · content-model.md · runbooks/ · templates/
prompts/        reusable prompts, versioned with the code
```

**Not a monorepo.** There is no pnpm workspace: `src/` and `studio/` are independent apps, each
with its own `package.json` and lockfile. Install both with `pnpm install:all`. Handing a client a
Turborepo when their site is one app is a bad handoff.

## Commands

| | |
|---|---|
| `pnpm install:all` | Install the app **and** the Studio |
| `pnpm dev` | Next.js on :3000. If it shows content older than what is published, stop it and delete `.next/dev/cache/fetch-cache` |
| `pnpm studio` | Sanity Studio on :3333 |
| `pnpm check` | Typecheck, lint, unit tests, build. **Run before every commit** |
| `pnpm test:a11y` | The Playwright browser checks, axe-core included |
| `pnpm test:perf` | The Lighthouse budgets |
| `pnpm typegen` | Regenerate `sanity.types.ts` from the schema and queries |
| `pnpm tokens` | Rebuild `src/app/tokens.css` from `tokens/`; fails on a WCAG AA contrast regression |
| `pnpm studio:build` | Build the Studio for production: the real check that the schema resolves |
| `pnpm lint:fix` | Biome autofix, including after Claude Code rewrites `.claude/settings.json` |

**`pnpm check` is not the whole gate.** It runs no browser checks: run `pnpm test:a11y` and
`pnpm test:perf`, and load the page. A green `pnpm check` is not a working page.

## Stack

Next.js 16 App Router · React 19 · TypeScript 6, strict · Tailwind v4 (configured in CSS, with no
`tailwind.config.js`) · shadcn/ui on **Radix** primitives · Sanity, GROQ and TypeGen · Biome · pnpm
· Vercel.

**Versions are pinned exactly.** Don't introduce a caret range: version drift between client sites
is the problem this starter exists to prevent.

## Creation-time conventions

These live here rather than in `.claude/rules/` on purpose: path-scoped rules fire only when an
agent **reads** a matching file, so they are silent at the exact moment a new file is written.

- **Secrets:** real values go in `.env.local` only, referenced as `process.env.NAME`. Never inline a
  credential, and never pass one as a shell argument. `NEXT_PUBLIC_` is an *escalation*, not an
  exemption: Next inlines it into the browser bundle at build time.
- **New route** (`src/app/**/page.tsx`): export `metadata` or `generateMetadata`, with one `h1`. A
  Server Component unless it needs interactivity.
- **New component:** a Server Component by default; `'use client'` only on the smallest leaf that
  needs it. Never import a server-only module into a client component.
- **New schema type** (`studio/schemaTypes/`): a kebab-case filename, a named export matching it,
  registered in `index.ts`. Model the content before writing the page. Prefer the existing `page`
  and its page builder over a new document type: a new type must have fields a generic page does
  not.
- **The archetype** is one line in `studio/archetype.ts`. Types that belong to one archetype never
  go in the base model: hardcoding `post` into the shared link targets is what once made selecting
  another archetype fail with `Unknown type: post`.
- **Design tokens:** never hardcode a hex value, a spacing value or a font size. Edit `tokens/` and
  run `pnpm tokens`; `src/app/tokens.css` is generated. Only `tokens/semantic/` may reference the
  raw ramp: a component pointing at `--brand-500` cannot be rebranded.
- **shadcn components:** add them with `--base radix`. The CLI's default base is Base UI, the wrong
  primitive layer for this project.
- **After changing a GROQ query or the schema:** run `pnpm typegen`.
- **Content written outside the Studio** (through the API, a script or the Sanity MCP) skips the
  Studio's validation. Run `pnpm --dir studio exec sanity documents validate` before publishing it.

## Hard constraints

Non-negotiable. If a request conflicts with one, say so before building.

- **Accessibility: WCAG 2.2 AA.** Semantic HTML first: a `div` with `onClick` is a defect.
  Keyboard reachable, visible focus, an accessible name, meaningful `alt`. Automated checks catch
  roughly 30 to 40% of real barriers, so they are a floor, not proof.
- **SEO and GEO are designed in, never bolted on.** Metadata on every route, typed JSON-LD derived
  from the same data the page renders, absolute canonical URLs.
- **Performance budgets** apply to the Core Web Vitals. Always give Sanity images an explicit width:
  the original asset can be several megabytes.
- **Never commit a secret.** Project IDs and dataset names are public by design; API tokens never
  are. The Sanity read token must be **Viewer**-scoped, because `next-sanity` sends it to the
  browser in draft mode.
- **The redirect map is non-negotiable on a replacement site.** Every old URL maps to a new one or
  to a deliberate 410. Losing search equity at launch is the most damaging and most preventable
  failure in this work.

## What not to do

- Don't add a dependency without justifying it. Lean, justified tooling over sprawl.
- Don't ship code from a Figma Make concept. Extract the direction and tokens, then build properly.
- Don't hand-edit `sanity.types.ts`, `schema.json` or `src/app/tokens.css`: all three are generated.
- Don't add a `tailwind.config.js`. Tailwind v4 is configured in CSS.
- Don't relax `pnpm check` to get a build out. If types or lint fail, the code is wrong.
- Don't keep this site's working context, its decisions and notes, anywhere but this repository.

## Where context lives

- **This repository** is canonical for anything about this site, its decisions included.
- `docs/decisions/`: the site's ADRs. Every material choice gets one, with a revisit trigger; the
  convention is in `docs/decisions/README.md`.
- `docs/content-model.md`: the schema map and the editorial rules.
- `docs/runbooks/`: deploying, rollback, the cutover, restoring content, incidents, audits.
- `HANDOFF.md`: kept current as the site is built, not written the week before launch.
- How Effizien works lives in `effizien-system`. Documents the client sees and edits live in Google
  Drive. The client's research report and context files live in the working folder. Link between
  them; never copy.

## Session protocol

Start by reading this file and confirming what you are working on. End by updating `HANDOFF.md` if
anything material changed, and by writing a handoff note (`prompts/handoff-note.md`).

If the work would change a decision recorded in `docs/decisions/`, **stop and raise it** rather than
deciding it mid-build. Tooling sprawl rarely arrives as a decision. It arrives as a
reasonable-sounding suggestion sixty messages into a long session.

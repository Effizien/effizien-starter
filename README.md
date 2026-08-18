# effizien-starter

Template repository for production client websites. **Next.js 16 App Router · Sanity ·
Vercel**, with SEO, GEO and WCAG 2.2 AA designed in rather than bolted on.

New sites are created with **Use this template** — not by forking, which would tie every
site's history to this repo.

---

## Scaffold a new site

### 1. Create the repo and install

```bash
gh repo create Effizien/<client>-site --template Effizien/effizien-starter --private
git clone https://github.com/Effizien/<client>-site && cd <client>-site
pnpm install:all
```

`install:all` installs **both** apps. The Next.js app and the Sanity Studio are separate
packages with their own dependencies — a plain `pnpm install` only does the app.

### 2. Create the Sanity project

At [sanity.io/manage](https://www.sanity.io/manage), with its own project per client —
never a shared one. Note the **project ID**.

Then create a token: **API → Tokens → Add token**, role **Viewer**.

> ⚠️ **Viewer, not Editor or Deploy.** `next-sanity` sends this token to the browser in
> draft mode so editors can see unpublished content. That is safe for a read-only token
> and hands every draft-mode visitor write access if it isn't one.

### 3. Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`, then create `studio/.env.local` with the three `SANITY_STUDIO_`
variables listed at the bottom of `.env.example`.

`.env.local` is gitignored. `.env.example` is committed and must never contain a real
value — a credential there is a credential in git history, which is fixed by rotating it
at the vendor, not by deleting the line.

### 4. Allow the app to talk to Sanity

```bash
pnpm --dir studio cors
```

Adds `http://localhost:3000` to the project's CORS origins with credentials. **Repeat for
the production URL** once the domain is known, or draft mode returns 403 in production
while working perfectly in development.

### 5. Trust the workspace — the secret guard depends on it

```bash
claude
```

Accept the trust prompt on first run.

> ⚠️ **Until the workspace is trusted, Claude Code skips every hook** — including the
> secret-scanning guard in `.claude/hooks/`. It fails silently: nothing appears in the
> transcript, only in the debug log. Verify with:
>
> ```bash
> claude --debug -p "say ok" 2>&1 | grep -i hook
> ```
>
> Trust is inherited from parent directories, so a clone inside an already-trusted folder
> is live immediately.

### 6. Run it

```bash
pnpm dev      # app    → http://localhost:3000
pnpm studio   # Studio → http://localhost:3333
```

### 7. Make it this client's repo

Replace every `[BRACKETED]` placeholder in `AGENTS.md` and `HANDOFF.md`, and set the
`title`/`description` in `src/app/layout.tsx`. A placeholder left in `AGENTS.md` is a
placeholder every future agent session reads as fact.

---

## Commands

| | |
|---|---|
| `pnpm install:all` | install app **and** Studio |
| `pnpm dev` | Next.js on :3000 |
| `pnpm studio` | Sanity Studio on :3333 |
| `pnpm check` | typecheck → lint → build. Run before every commit |
| `pnpm typegen` | regenerate `sanity.types.ts` from schema + queries |
| `pnpm lint:fix` | Biome autofix |
| `pnpm studio:deploy` | publish the Studio to `<projectId>.sanity.studio` |

## Structure

```
src/                 Next.js app
├── app/             routes
├── components/ui/   shadcn copy-in
├── lib/             shared utilities
└── sanity/          client, live, image, token — the CMS boundary
studio/              standalone Sanity Studio (own package.json)
docs/                decisions/ · content-model.md · runbooks/
prompts/             session-start · handoff-note
.claude/             settings, path-scoped rules, secret-scanning hook
AGENTS.md            canonical briefing (CLAUDE.md symlinks to it)
HANDOFF.md           the "someone else takes over" doc
```

**Two apps, one repo, no monorepo tooling.** The Studio is standalone rather than embedded
at `/studio` so it auto-updates with Sanity's fixes — an embedded Studio turns every
Sanity release into a dependency bump and a redeploy on every site.

## Deploying

- **App:** import the repo in Vercel, add the environment variables, deploy. Push to
  `main` ships; PRs get preview deploys.
- **Studio:** `pnpm studio:deploy`. Independent of the app.
- Add the Studio `appId` from sanity.io/manage to `deployment` in `studio/sanity.cli.ts`
  to pin an auto-update channel instead of always tracking latest.

## Conventions worth knowing before you edit

- **Versions are pinned exactly** and `.npmrc` sets `save-exact`. Don't introduce caret
  ranges — version drift between client sites is what this template prevents.
- **Tailwind v4 is configured in CSS**, in `src/app/globals.css`. There is no
  `tailwind.config.js` and adding one will confuse more than it helps.
- **Add shadcn components with `--base radix`.** The CLI's default is now Base UI, which
  is the wrong primitive layer here.
- **`sanity.types.ts` and `schema.json` are generated.** Run `pnpm typegen` after any
  schema or query change; never hand-edit them.
- **Design tokens are generated.** Edit `tokens/` and run `pnpm tokens`; `src/app/tokens.css`
  is build output and must never be hand-edited. Don't hardcode colours, spacing or font
  sizes.

## What a site scaffolded today already has

| | |
|---|---|
| Three-tier design tokens → `pnpm tokens`, which **fails the build** when a declared colour pair drops below its WCAG contrast threshold | WP3 |
| Content model: three archetypes selected by one constant, page-builder blocks, editorial validation, required alt text, derived heading levels | WP4 |
| SEO/GEO: metadata, typed JSON-LD, sitemap, robots with an AI-crawler policy, `llms.txt`, IndexNow, and the redirect map with 410s | WP5 |
| Accessibility and performance gates: axe-core over Playwright, Lighthouse CWV budgets, unit tests, and four **required status checks** that block a merge | WP6 |
| **Page-builder rendering.** All six base blocks plus the archetype's, article bodies with byline and date, the blog index, and `FAQPage` structured data wired to the block that renders it | WP12 |

## What it does not include yet

Built in later work packages, so a site scaffolded today does not have them:

| | |
|---|---|
| Statsig experimentation, and the GA4 component that reads `NEXT_PUBLIC_GA_MEASUREMENT_ID` | WP7 |
| Launch checklist, DNS cutover and rollback runbooks | WP9 |
| Catalogue page-builder blocks — `productList` and `enquiryForm` are modelled in the schema but have no components, and the enquiry form has no submission path. They are a catalogue site's work; see `src/components/page-builder/archetype-blocks.tsx` | — |

**Two per-site steps fail silently** and belong on a launch checklist rather than in
anyone's memory: the IndexNow key, without which every submission is skipped, and the
Sanity publish webhook, without which the sitemap and both `llms` files refresh only on
deploy. Both are documented in `docs/runbooks/seo-geo-audit.md`.

The accessibility and SEO requirements in `AGENTS.md` apply from the first commit, and
since WP6 they are enforced by CI rather than by review: a merge to `main` is blocked
until axe, Lighthouse, the unit tests and the Studio build all pass.

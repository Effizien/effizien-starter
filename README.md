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
- **Design tokens live in `globals.css`** and are replaced wholesale by the Figma token
  pipeline. Don't hardcode colours, spacing or font sizes.

## What this template does not include yet

Built in later work packages, so a site scaffolded today does not have them:

| | |
|---|---|
| Design tokens from Figma Variables | WP3 |
| Content model and page-builder blocks — `studio/schemaTypes/` is empty | WP4 |
| SEO/GEO module — JSON-LD, sitemap, `llms.txt`, IndexNow | WP5 |
| Accessibility and CWV CI gates | WP6 |
| Statsig experimentation | WP7 |
| Launch checklist, DNS cutover and rollback runbooks | WP9 |

The accessibility and SEO requirements in `AGENTS.md` apply from the first commit
regardless — the gates that enforce them automatically arrive later, and until then they
are enforced by review.

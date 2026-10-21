# effizien-starter

The deployable foundation of the Effizien system: the template every client site is deployed from.
**Next.js 16 App Router · Sanity · Vercel**, with SEO, GEO, AEO and WCAG 2.2 AA built into the
structure rather than added at the end.

The system's playbook, its decisions and processes, is `effizien-system`. Each client site gets its
own repository from this one, created with **Use this template**: not a fork, which would tie every
site's history to this repository.

## How a client deployment starts

1. **Discovery comes first.** The founder and the planning chat gather the client's research,
   context and goals, and put a research report and context files in the client's working folder
   (`effizien-system/docs/05-DISCOVERY-KIT.md`).
2. **A new Claude Code session** reads `effizien-system`, this starter and the working folder, then
   creates the site's repository and follows the steps below.

The kickoff that joins the two, meaning the working folder's convention and the starting prompt, is
`effizien-system`'s WP13 and is not built yet.

---

## Create a client site

### 1. Create the repository and install

```bash
gh repo create Effizien/<client>-site --template Effizien/effizien-starter --private
git clone https://github.com/Effizien/<client>-site && cd <client>-site
pnpm install:all
```

`install:all` installs **both** apps. The Next.js app and the Sanity Studio are separate packages
with their own dependencies; a plain `pnpm install` only does the app.

Then turn on automatic deletion of merged branches. A repository created from a template does not
inherit the setting:

```bash
gh api -X PATCH repos/Effizien/<client>-site -F delete_branch_on_merge=true
```

### 2. Create the Sanity project

At [sanity.io/manage](https://www.sanity.io/manage), one project per client, never a shared one.
Note the **project ID**, then create a token: **API → Tokens → Add token**, role **Viewer**.

> ⚠️ **Viewer, not Editor or Deploy.** `next-sanity` sends this token to the browser in draft mode
> so editors can see unpublished content. That is safe for a read-only token, and it hands every
> draft-mode visitor write access if it isn't one.

**If the site reuses an existing Sanity project**, as a replacement site sometimes does, clear what
is in it before the first deploy, in this order:

1. List everything in the dataset, assets included. Deleting a document does not delete the images
   it used.
2. Remove references before the documents they point at, and delete leaves before roots. Content
   can reference itself in a cycle; clear both sides first.
3. Through the Sanity MCP, removing a document means unpublishing it and then discarding the draft,
   and unpublishing leaves a draft that still holds the original's references: discard each wave
   before starting the next.
4. Check what references an asset before removing it. The logo is often referenced by the site
   settings.
5. Run `pnpm --dir studio exec sanity documents validate`. It lists fields the current schema no
   longer declares, which can still hold old text that the Studio does not show.

Redirect documents matter most: each one becomes a live 301 or 410 the moment the site deploys
against the dataset.

### 3. Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`, then create `studio/.env.local` with the three `SANITY_STUDIO_` variables
listed at the bottom of `.env.example`.

`.env.local` is gitignored. `.env.example` is committed and never contains a real value: a
credential there is a credential in git history, which is fixed by rotating it at the vendor, not
by deleting the line.

### 4. Allow the app to talk to Sanity

```bash
pnpm --dir studio cors
```

That adds `http://localhost:3000` to the project's CORS origins, with credentials. Once they exist,
add the stable preview origin, which is the Vercel branch alias
(`https://<project>-git-main-<team>.vercel.app`), and the production URL:

```bash
pnpm --dir studio exec sanity cors add https://<origin> --credentials
```

Without them, draft mode and the Presentation tool return 403 on a preview or in production while
working perfectly in development. A preview's own hostname changes on every deployment, so only
the branch alias is worth adding.

### 5. Trust the workspace, because the secret guard depends on it

```bash
claude
```

Accept the trust prompt on the first run.

> ⚠️ **Until the workspace is trusted, Claude Code skips every hook,** including the
> secret-scanning guard in `.claude/hooks/`. It fails silently: nothing appears in the transcript,
> only in the debug log. Verify with:
>
> ```bash
> claude --debug -p "say ok" 2>&1 | grep -i hook
> ```
>
> Trust is inherited from parent directories, so a clone inside an already-trusted folder is live
> immediately.

### 6. Run it

```bash
pnpm dev      # app    → http://localhost:3000
pnpm studio   # Studio → http://localhost:3333
```

If `pnpm dev` shows content older than what is published, stop it and delete
`.next/dev/cache/fetch-cache`. The development server keeps its data cache there across restarts.

### 7. Make it this client's repository

- Replace every `[BRACKETED]` placeholder in `AGENTS.md` and `HANDOFF.md`, and set the `title` and
  `description` in `src/app/layout.tsx`. A placeholder left in `AGENTS.md` is a placeholder every
  future agent session reads as fact.
- **Replace this README** with the site's own: what the site is, how to run it, where things are.
- **Point the browser gates at the site's pages.** `e2e/routes.ts` and `lighthouserc.json` list the
  starter's sample routes, which a client site does not have.
- **Set `studioHost`** in `studio/sanity.cli.ts`, a hostname that is unique across all of Sanity,
  then run `pnpm studio:deploy`. The Studio is then at `https://<studioHost>.sanity.studio`. Add the
  Studio's `appId` from sanity.io/manage under `deployment` to pin a version channel instead of
  always tracking the latest.

### 8. Configure CI

Set `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET` as repository **variables**
(Settings → Secrets and variables → Actions → Variables). Both are public by design, and three of
the four CI jobs fail fast without them.

The four checks run on every pull request. On a private repository in a free GitHub organization
they report but cannot block a merge: required checks need GitHub Team
(`effizien-system/docs/02-STACK-V1.md` §9).

### 9. Connect Vercel without publishing the unfinished site

Vercel Pro is required: Hobby cannot connect repositories owned by a GitHub organization, and it is
for non-commercial use only.

1. Create a `production` branch from `main` and push it. Vercel will not save a production branch
   that does not exist.
2. Import the repository into the Effizien team on Vercel. A new project's first deployment is
   always a production deployment.
3. In the project's **Environments** settings, open **Production → Branch Tracking** and set the
   branch to `production`. Then remove that first production deployment.
4. Add the environment variables, whose names are in `.env.example`, for Preview and Production.

From then on, a push to `main` builds a preview, protected by Vercel Authentication and served with
`Disallow: /` and `noindex`. At launch, merging `main` into `production` puts the site live, and
with Auto-assign Custom Production Domains on, it does so immediately. The pre-launch checklist and
the DNS cutover runbook come first.

---

## Commands

| | |
|---|---|
| `pnpm install:all` | Install the app **and** the Studio |
| `pnpm dev` | Next.js on :3000 |
| `pnpm studio` | Sanity Studio on :3333 |
| `pnpm check` | Typecheck, lint, unit tests, build. Run before every commit |
| `pnpm test:a11y` | The Playwright browser checks, axe-core included |
| `pnpm test:perf` | The Lighthouse budgets |
| `pnpm typegen` | Regenerate `sanity.types.ts` from the schema and queries |
| `pnpm lint:fix` | Biome autofix |
| `pnpm studio:deploy` | Publish the Studio to `https://<studioHost>.sanity.studio` (step 7) |

## Structure

```
src/                 Next.js app
├── app/             routes
├── components/ui/   shadcn components, copied in
├── lib/             shared utilities
└── sanity/          client, live, image, token: the CMS boundary
studio/              standalone Sanity Studio (its own package.json)
docs/                decisions/ · content-model.md · runbooks/ · templates/
prompts/             session-start · handoff-note
.claude/             settings, path-scoped rules, the secret-scanning hook
AGENTS.md            the briefing (CLAUDE.md is a symlink to it)
HANDOFF.md           the "someone else takes over" document
```

**Two apps, one repository, no monorepo tooling.** The Studio is standalone rather than embedded at
`/studio` so it takes Sanity's fixes automatically. An embedded Studio turns every Sanity release
into a dependency bump and a redeploy on every site.

## Deploying

- **App:** a push to `main` builds a protected preview, and production deploys from the
  `production` branch (step 9). Pull requests get preview deployments too.
- **Studio:** `pnpm studio:deploy`, independent of the app.
- **Rollback:** promote the last good deployment in Vercel (`docs/runbooks/rollback.md`).

## Conventions worth knowing before you edit

- **Versions are pinned exactly.** Don't introduce caret ranges: version drift between client sites
  is what this template prevents.
- **Tailwind v4 is configured in CSS,** in `src/app/globals.css`. There is no
  `tailwind.config.js`, and adding one confuses more than it helps.
- **Add shadcn components with `--base radix`.** The CLI's default is Base UI, which is the wrong
  primitive layer here.
- **`sanity.types.ts` and `schema.json` are generated.** Run `pnpm typegen` after any schema or
  query change; never hand-edit them.
- **Design tokens are generated.** Edit `tokens/` and run `pnpm tokens`; `src/app/tokens.css` is
  build output. Don't hardcode colors, spacing or font sizes.
- **After changing a setting through Claude Code,** such as enabling a plugin or saving a
  permission, run `pnpm lint:fix`. Claude Code rewrites `.claude/settings.json`, and Biome's format
  check fails on the result.

## What a site created from the starter has

| | |
|---|---|
| Three-tier design tokens, built by `pnpm tokens`, which **fails** when a declared color pair drops below its WCAG contrast threshold | WP3 |
| The content model: three archetypes selected by one constant, page-builder blocks, editorial validation, required alt text, heading levels derived from position | WP4 |
| SEO and GEO: metadata, typed JSON-LD derived from the content, a sitemap, `robots.txt` with an AI-crawler policy, `llms.txt`, IndexNow, and the redirect map with 410s | WP5 |
| Accessibility and performance checks: axe-core through Playwright, Lighthouse budgets and unit tests, run by CI on every pull request | WP6 |
| Page-builder rendering: the six base blocks plus the archetype's, article bodies with byline and date, the blog index, and `FAQPage` structured data from the block that renders it | WP12 |
| The launch kit: a pre-launch checklist, and runbooks for deploying, rollback, the DNS cutover, restoring content and incidents | WP9 |
| Security headers, and a Claude Code hook that stops an AI agent writing a credential into a file git would track (it does not check a person's own commits) | WP2 |

## What it does not include yet

| | |
|---|---|
| Experimentation (Statsig) and analytics. The analytics runbook's measurement ID has no component that reads it yet | WP7 |
| Site chrome: a header, footer, menus and a skip link. `navigation` is modelled, and nothing renders it | Built per site |
| A contact form, and the catalogue blocks. `enquiryForm` and `productList` are modelled without components or a submission path | Built per site |

A site adds modules as it needs them, such as a Content Security Policy, consent, transactional
email or spam protection: the list is `effizien-system/docs/02-STACK-V1.md`.

**Two per-site steps fail silently,** so the pre-launch checklist carries both: the IndexNow key,
without which every submission is skipped, and the Sanity publish webhook, without which the
sitemap and both `llms` files refresh only on deploy.

The accessibility and SEO requirements in `AGENTS.md` apply from the first commit. CI checks them
on every pull request; whether a failing check can block a merge depends on the repository's GitHub
plan (step 8).

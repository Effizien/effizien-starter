# Handoff — [CLIENT NAME]

> Written as if you'll be hit by a bus. Kept current as the site is built — **not**
> written the week before launch, which is when the details everyone assumed were
> obvious turn out not to be written down anywhere.
>
> Last updated: [YYYY-MM-DD] by [name]

## At a glance

| | |
|---|---|
| Production | [https://…] |
| Studio | [https://<projectId>.sanity.studio] |
| Repo | [github.com/…] |
| Hosting | Vercel — project `[name]` |
| CMS | Sanity — project `[projectId]`, dataset `[production]` |
| Archetype | [marketing \| catalog \| docs] |
| Launched | [YYYY-MM-DD] |

## Stack and versions

Next.js 16 App Router · React 19 · TypeScript 6 · Tailwind v4 · shadcn/ui on Radix ·
Sanity · Biome · pnpm. Exact versions are in `package.json` and `studio/package.json`;
both pin exactly, with no caret ranges. Renovate opens grouped update PRs weekly.

## Environment variables

Names and purposes are in `.env.example`. **Values live in two places only:** each
developer's local `.env.local` (gitignored), and Vercel's environment variables.

| Variable | Where it comes from | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | sanity.io/manage | No — public by design |
| `NEXT_PUBLIC_SANITY_DATASET` | usually `production` | No |
| `NEXT_PUBLIC_SITE_URL` | the production domain | No |
| `SANITY_API_READ_TOKEN` | sanity.io/manage → API → Tokens | **Yes — Viewer role only** |
| `SANITY_REVALIDATE_SECRET` | generated; also set on the Sanity webhook | **Yes** |

⚠️ The read token must be **Viewer**-scoped. `next-sanity` sends it to the browser in
draft mode so editors can see unpublished content — safe for a read-only token, a
serious problem for a write-capable one.

**If a token is ever exposed:** rotate it at Sanity first, then update Vercel. Deleting
it from a file is not enough — it survives in git history.

## Deploy and rollback

- **App:** push to `main` → Vercel builds and deploys. PRs get preview deploys.
- **Studio:** `pnpm studio:deploy` → `<projectId>.sanity.studio`. Independent of the app;
  it also auto-updates itself with Sanity's fixes.
- **Rollback:** Vercel → Deployments → the last known-good one → *Promote to Production*.
  Faster and safer than reverting and rebuilding.
- **Runbooks:** `docs/runbooks/deploy.md` and `rollback.md`. Launch day is
  `pre-launch-checklist.md` then `dns-cutover.md`. Site down is `incident.md`.

## Content backups — read this before you need it

| | |
|---|---|
| Sanity history retention | **[3 days on Free · 90 on Growth · 365 on Enterprise — state which]** |
| Automatic dataset backup | **[None unless the plan is Enterprise — state plainly]** |
| Scheduled export | **[None / cron / GitHub Action — say which, and where the file goes]** |
| Last manual export | **[date, and where it is kept]** |

⚠️ **Do not leave this table with its defaults.** On the Free plan there is a three-day
window and no automatic backup, which is enough for "an editor broke a page this morning"
and nothing else. A client who believes their content is backed up when it is not has been
told something false, and this is the table where that gets corrected.

**Three days with no scheduled export is a defensible answer for a small marketing site**,
and on this starter it is the deliberate one — marketing copy is recreatable, and an
export taken by hand before anything risky covers the losses that actually happen. It stops
being defensible the moment a site holds something a customer typed: an order, an enquiry,
a submission. Say which of the two this site is, in writing, here.

Confirm the real number rather than copying this one:

```bash
pnpm --dir studio exec sanity documents get _.retention._maximum_project
```

Procedure, including taking an export and restoring from one: `docs/runbooks/content-restore.md`.

## Content model

Full map in `docs/content-model.md`. Schema source: `studio/schemaTypes/`.

After any schema or query change, run `pnpm typegen` — `sanity.types.ts` is generated and
committed, so a stale one means the types no longer describe the data.

## Search and AI visibility

Nothing here needs configuring per page. It is wired to the content and runs on every
route — the editor's only controls are in *SEO & sharing* on each document.

| | |
|---|---|
| Sitemap | `[https://…]/sitemap.xml` — generated from published content, nothing to upload |
| Robots | `[https://…]/robots.txt` — AI crawlers **allowed** by default (ADR-002) |
| AI files | `/llms.txt` and `/llms-full.txt`, generated at build |
| Search Console | [property link] · setup procedure: `docs/runbooks/search-console-and-analytics.md` |
| Analytics | GA4 `[G-XXXXXXXXXX]` |
| Redirects | Edited in the Studio under **Redirects**. Take effect on the **next deploy** |
| Instant indexing | IndexNow — Bing, Yandex, Seznam, Naver. **Not Google**, which still crawls |
| Audit | `docs/runbooks/seo-geo-audit.md` — run before launch and a week after |

**The one variable that matters:** `NEXT_PUBLIC_SITE_URL`. Every canonical, Open Graph
and sitemap URL is built from it. A production deploy with it unset or pointing at
localhost **fails the build on purpose** rather than shipping a site that tells Google
its content lives somewhere unreachable.

**Preview deploys are not indexable**, by two mechanisms — `robots.txt` disallows and an
`X-Robots-Tag: noindex` header is sent. Crawling and indexing are separate permissions
and a staging copy needs both denied.

**Two editor controls can remove a page from Google**, both under *SEO & sharing →
Advanced*. When a page is missing from search, check these before anything else:

- **Search engines → Hidden** takes the page out of Google *and* out of the sitemap.
  Correct for thank-you pages; surprising everywhere else.
- **Canonical URL** points search engines at a different page as the original. It is for
  republished content only. Empty is almost always right.

**What we do not claim.** The site is built to be found; nobody can promise rankings. The
AI-visibility files (`llms.txt`) are cheap and durable, and no major provider has
confirmed reading them — we ship them as insurance, not as a lever. See
`docs/runbooks/seo-geo-audit.md` for the full version of what this does and does not do.

## Who can edit what

| Person | Sanity role | Notes |
|---|---|---|
| [name] | Administrator | [ ] |
| [name] | Editor | Day-to-day content |
| [name] | Viewer | Read-only / stakeholder |

Manage at sanity.io/manage → project → Members. **Remove departing staff here first** —
it is the fastest path to revoking content access.

Training material: [link]. Recorded walkthrough: [link].

## Known issues and deliberate technical debt

Be honest here. A handoff that claims everything is perfect is not believed, and it hides
the things the next person most needs to know.

| Item | Why it's like this | What it would take to fix |
|---|---|---|
| [ ] | [ ] | [ ] |

## Open questions

- [ ]

## Contacts

| Role | Name | Contact |
|---|---|---|
| Client decision-maker | [ ] | [ ] |
| Content owner | [ ] | [ ] |
| Domain / DNS control | [ ] | [ ] |
| Build team | [ ] | [ ] |

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
- **Runbooks:** `docs/runbooks/`.

## Content model

Full map in `docs/content-model.md`. Schema source: `studio/schemaTypes/`.

After any schema or query change, run `pnpm typegen` — `sanity.types.ts` is generated and
committed, so a stale one means the types no longer describe the data.

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

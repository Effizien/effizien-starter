# Deploy

A normal deploy to production, what a healthy one looks like, and how to know it worked.

**You do not run a deploy.** Pushing to `main` is the deploy — Vercel builds every push
and promotes `main` to production automatically. This runbook is mostly about the two
minutes *after* that, which is the part people skip.

For a deploy that went out and should not have, stop here and use `rollback.md`.

```bash
export SITE=https://example.com
```

---

## Before: what already blocked a bad merge

Four checks are **required** on `main` and a red one blocks the merge button. This is
enforcement, not a report — ADR-005 records the day that changed.

| Check | Covers |
|---|---|
| Typecheck, lint, test, build | `pnpm check` — types, Biome, unit tests, a Next production build |
| Studio build | The schema actually resolves, which `tsc` alone does not prove |
| Accessibility (axe-core) | WCAG 2.2 AA across every route in `e2e/routes.ts` |
| Core Web Vitals (Lighthouse) | Budgets from ADR-004, three runs, median |

**There is exactly one way past them, and it is deliberate:** `enforce_admins` is off, so
an administrator can merge a red branch. That exists so a solo operator is never locked
out of his own `main` mid-launch. If you use it, you have skipped every check above —
write down which one was red and why you overrode it.

---

## 1 · Merge to `main`

1. Merge the pull request once all four checks are green.
   **Expected:** GitHub reports the merge; Vercel starts a Production deployment within
   about ten seconds.

Nothing else is required. There is no `vercel.json` in this repository and no deploy
command to run — the Git integration owns it.

---

## 2 · Watch the build

2. Open Vercel → the project → **Deployments**. The newest row is your merge, marked
   *Production*.
   **Expected:** *Building* → *Ready*, typically inside two minutes.

3. If it is *Ready*, open the build log and confirm the route table printed near the end.
   **Expected:** a list of routes with `○` (static), `●` (SSG, from `generateStaticParams`)
   and `ƒ` (dynamic, server-rendered on demand). Every page an editor has published should
   appear as `●` under `/[slug]` or `/blog/[slug]`.

**A missing page here is a content problem, not a build problem.** `generateStaticParams`
only builds what the dataset returns, so a page that is absent was never published, is
hidden from search, or has no slug.

---

## 3 · Verify production

Run the four checks that decide whether the site is visible at all. They live in
`seo-geo-audit.md` §1 and are not repeated here — a second copy would drift from the
first, and the one nobody updated is the one someone follows.

4. Work through `seo-geo-audit.md` §1 against `$SITE`.
   **Expected:** no `x-robots-tag` header, `robots.txt` allowing crawling with a
   `Sitemap:` line on the live domain, a sitemap whose `<loc>` values are on the live
   domain, and an absolute canonical on the home page.

5. Confirm the deployed content is the content you expected.
   ```bash
   curl -s "$SITE/sitemap.xml" | grep -c "<loc>"
   ```
   **Expected:** a count matching the number of published pages plus articles. A sudden
   drop means content was unpublished or hidden, not that the deploy failed.

**If 1.1 and 1.2 both fail**, the deployment is not being treated as production —
`VERCEL_ENV` is not `production`. The code is right and the deploy is wrong. Promote the
build in Vercel rather than editing `src/app/robots.ts`.

---

## 4 · The Studio deploys separately

The Studio is a second application with its own dependencies and its own deploy. Pushing
to `main` does **not** update it.

6. Deploy it only when `studio/` changed:
   ```bash
   pnpm studio:deploy
   ```
   **Expected:** the CLI prints the hosted Studio URL, `https://<projectId>.sanity.studio`.

Sanity keeps the Studio's own dependencies current on its side, so a Studio that has not
been redeployed in months is normal and not a fault.

---

## When the build fails

Read the error before changing anything. Three account for almost all of them:

| Symptom in the log | Cause | Fix |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL is not set on this production deployment` | The variable is missing in Vercel | Set it to the live `https://` origin in Project → Settings → Environment Variables, then redeploy. It is verified: `src/lib/seo/site-url.ts` throws only when `VERCEL_ENV === 'production'`, so local and preview builds are unaffected |
| `NEXT_PUBLIC_SITE_URL is "http://localhost:3000" on a production deployment` | It is set, to a placeholder | Same fix. `localhost`, `127.0.0.1` and any `*.vercel.app` host are rejected in production, because each would be written into every canonical tag on the site |
| `Missing environment variable: NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity is not configured for this environment | Set project ID and dataset. Both are public by design — see `.claude/rules/secrets.md` |

A build failure never affects the live site. The previous deployment keeps serving until a
new one succeeds, which is why a failed deploy is an inconvenience and a bad *successful*
deploy is an incident.

---

## When the deploy succeeded and the site is wrong

Go to `rollback.md`. Do not attempt a fix-forward on a live client site under time
pressure — promote the last good build first, then debug with the site already working.

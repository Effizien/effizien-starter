# Rollback

Getting a bad production deploy off the live site, fast.

**Promote the last good build. Do not revert and rebuild.** A revert is a new commit, a
new CI run and a new build — five to ten minutes during which the broken site is still
serving. Promoting an existing deployment is a routing change and takes seconds, because
the build already exists and already passed.

```bash
export SITE=https://example.com
```

---

## First: is this actually a deploy problem?

Ninety seconds here saves an unnecessary rollback. A rollback fixes *code*. It does
nothing for content or configuration, and rolling back to escape a content problem wastes
the outage.

| What you are seeing | This runbook? |
|---|---|
| Error page, blank page, broken layout, a route 500ing | **Yes** |
| Wrong or missing text, a page gone, a deleted image | No — `content-restore.md` |
| Whole site unreachable, DNS or TLS errors | No — `incident.md` |
| Site fine, but pages missing from Google | No — `seo-geo-audit.md` |

**A page that vanished after a deploy is usually content, not code.** Pages are built from
what the dataset returns, so an unpublished or hidden document disappears on the next
build with nothing wrong in the code.

---

## The rollback

1. Open Vercel → the project → **Deployments**.
   **Expected:** a list newest-first, the top one marked *Production*.

2. Find the last deployment that was known good. Use the commit message and timestamp;
   it is the one *below* the deploy that broke things.
   **Expected:** status *Ready*, and an *Age* older than the incident.

3. Open that deployment and check it before promoting — its preview URL serves the same
   build you are about to make live.
   **Expected:** the page that is broken in production works here. If it does not, this
   build is not the fix; go further back, or this is not a deploy problem.

4. On that deployment: **⋯ → Promote to Production**.
   **Expected:** the confirmation dialog names the deployment. Confirm.

5. Wait for the promotion to complete.
   **Expected:** the *Production* marker moves to the deployment you chose, within
   seconds. No build runs — that is the point.

6. Verify against the live domain, not the preview URL:
   ```bash
   curl -sI "$SITE" | head -1
   curl -s "$SITE" | grep -o '<link rel="canonical"[^>]*>'
   ```
   **Expected:** a `200` on the first line — the protocol version varies with the
   connection and is not the signal — and a canonical on the live domain. Then load the
   page that was broken, in a browser, hard-refreshed.

The site is now serving the older build. **You have bought time, not fixed anything.**

---

## After: do not leave it there

`main` still contains the bad commit, so the next merge to `main` redeploys it and
re-breaks the site. Close the loop the same day.

7. Decide which:
   - **Revert** — `git revert <sha>` on a branch, open a PR, let the four checks run,
     merge. Correct when the change was wrong.
   - **Fix forward** — a branch that repairs it, same route through CI. Correct when the
     change was right and its implementation was not.

   **Expected either way:** the next deploy to `main` is green and production matches
   `main` again.

8. Write down what happened while you still remember: what broke, which deployment you
   promoted, what CI did not catch. **A rollback that CI should have prevented is a gap in
   the gates**, and it is the most useful thing an incident produces.

---

## If Promote to Production is not available

Rare, and it means the deployment list itself is the problem — the build was deleted, or
the project was disconnected from Git.

9. Check <https://www.vercel-status.com>. A platform incident is not something to fix from
   this side; watch it and tell the client the truth.

10. If Vercel is healthy, redeploy a known-good commit from the dashboard: **Deployments →
    ⋯ → Redeploy** on the last good build, with *Use existing Build Cache* off.
    **Expected:** a fresh build of that commit, three to five minutes. Slower than a
    promotion, which is why it is the fallback.

**Escalation.** Vercel support is the only route past a platform-side failure, and on a
Hobby plan that is community support with no response-time commitment. If a client's
revenue depends on the site being up, that is a plan decision to have made *before* the
incident, not during it — note it in `HANDOFF.md` under known issues.

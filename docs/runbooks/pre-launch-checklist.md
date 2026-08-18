# Pre-launch checklist

Everything that must be true before a client's domain points at this site.

**This is the orchestrator, not another audit.** The SEO, accessibility and analytics
procedures already exist and are thorough; this links to them at the right moment and owns
only the steps nothing else covers. Two documents describing the same check will drift,
and the one nobody updated is the one someone follows.

```bash
export SITE=https://project.vercel.app   # the Vercel domain, until cutover
```

Work through it in order. **Record the outcome of every item — ticked, or accepted with a
reason and a name against it.** A checklist with silent gaps is indistinguishable from one
nobody ran.

---

## 1 · Technical — the ones that fail silently

These are first because none of them announces itself. Each is a per-site setting that
looks fine when it is missing.

- [ ] **`NEXT_PUBLIC_SITE_URL` is the final domain**, set in Vercel → Settings →
      Environment Variables → Production.

      This one is self-enforcing, which is worth knowing: `src/lib/seo/site-url.ts` throws
      on a production build when it is unset, and rejects `localhost`, `127.0.0.1` and any
      `*.vercel.app` host. A production deploy that succeeded had a real domain.

- [ ] **The Sanity publish webhook exists and is signed.** Without it, the sitemap,
      `llms.txt` and `llms-full.txt` refresh only when someone deploys.

      Setup is in `src/app/api/revalidate/route.ts` — URL, dataset, triggers, filter,
      projection and secret. Verify it rejects an unsigned request:

      ```bash
      curl -s -o /dev/null -w '%{http_code}\n' -X POST "$SITE/api/revalidate" \
        -H 'Content-Type: application/json' -d '{}'
      ```

      **Expected: `401`.** Verified — the response body reads
      `Invalid or missing webhook signature`. A `200` here means the endpoint accepts
      unsigned requests and anyone can force rebuilds.

      Then publish a trivial change in the Studio and confirm the site updates without a
      deploy.

- [ ] **The IndexNow key is set**, or the decision not to use it is recorded.

      `INDEXNOW_KEY` is per-site and lives in the environment, never the repo. Without it
      `getIndexNowKey()` returns null, the `/<key>.txt` rewrite is never created, and
      **every submission is skipped with no error anywhere.**

      ```bash
      curl -s -o /dev/null -w '%{http_code}\n' "$SITE/api/indexnow-key"
      ```

      **Expected: `200`.** A `404` means the key is unset — verified, that is exactly what
      an unconfigured site returns. Generate one with `openssl rand -hex 16`.

      Tell the client the truth about what it buys: **Google does not participate.** Bing,
      Yandex, Seznam and Naver do. For a business whose search traffic is mostly Google,
      this affects well under a fifth of it.

- [ ] **Sanity CORS allows the production origin**, or the Studio cannot talk to it:
      `pnpm --dir studio exec sanity cors add https://example.com --credentials`.

- [ ] **The Studio is deployed** — `pnpm studio:deploy` — and the client can reach it.

- [ ] **Sanity member roles are set.** Administrator, Editor, Viewer, per person. Removing
      a departing member here is the fastest way to revoke content access.

- [ ] **Vercel environment variables are complete for Production**, not only Preview.
      Project ID, dataset, API version, site URL, read token, revalidate secret, IndexNow
      key.

- [ ] **The read token is Viewer-scoped.** `next-sanity` sends it to the browser in draft
      mode. Safe for a read-only token; a serious problem for a write-capable one.

---

## 2 · Content

- [ ] Every page the client expects exists and is published. Anything still in draft is
      invisible to the build, not merely unstyled.
- [ ] No placeholder copy, no lorem ipsum, no `[BRACKETED]` values left in content.
- [ ] Images have descriptions, or are marked decorative. The schema enforces this on
      upload; this checks nobody worked around it.
- [ ] `siteSettings` is filled in — name, description, social image, contact details.
- [ ] The 404 page is reachable and says something useful.
- [ ] **Take a content export before launch day** and keep it:
      `pnpm --dir studio exec sanity dataset export production ./pre-launch.tar.gz`.

      History retention on the Free plan is **three days**. See `content-restore.md` — this
      export is the only recovery that outlives that window.

---

## 3 · SEO

- [ ] **Run `seo-geo-audit.md` end to end.** Not summarised here.
- [ ] **§1, the four that stop everything, pass.** Nothing below matters until they do.
- [ ] **The redirect map is complete** — on a replacement site this is the highest-stakes
      item on this page. Every old URL returns `301` to the closest equivalent page, or a
      deliberate `410`. Not the homepage: Google reads that as a soft 404.
- [ ] **Redirects are deployed, not just published.** They are read from Sanity at build
      time, so a rule added after the last deploy does not exist yet.
- [ ] Search Console and GA4 per `search-console-and-analytics.md`. Verification can be
      done before cutover; sitemap submission waits until the domain resolves.

---

## 4 · Accessibility

- [ ] **CI is green on `main`.** Four required checks block a merge, so this is a real
      statement rather than an aspiration — see ADR-005. `enforce_admins` is off, so if
      anything was merged red, say which and why.
- [ ] **Run `accessibility-audit.md`.** CI covers the automatable part; the audit covers
      what it cannot see.
- [ ] **Run `screen-reader-protocol.md`.** Tasks 1–5, with a real screen reader.

      **This gates the accessibility statement.** WP12 handed this trigger here
      deliberately: `docs/templates/accessibility-statement.md` refuses to be published
      before the audit has run, and this line is what makes that refusal operational.

- [ ] **Record the result**: date, who ran it, browser and screen reader, which tasks
      passed, and every failure with a decision — fixed, accepted with a reason, or
      deferred with a date.

      "Ran the screen reader protocol ✓" is not a record. It cannot be audited and it is
      indistinguishable from not having run it.

---

## 5 · Legal

The section with no other home, and the one most often skipped because it belongs to
nobody.

- [ ] **Privacy policy** published and linked, naming what is collected and by whom. GA4
      makes the client a data controller; that is their obligation, and it is worth saying
      so in writing rather than assuming they know.
- [ ] **Cookie consent** decided. If GA4 is installed, consent is not optional in the UK
      and EU — `search-console-and-analytics.md` §7 covers the relationship.
- [ ] **Accessibility statement** published at `/accessibility` and linked from the footer
      — **only after §4 is complete.** Fill it from the completed audit, never from what
      the site is intended to do. A statement published because the template existed is a
      dated, documented, false claim, and it is the first thing produced in a complaint.
- [ ] **VPAT/ACR** only if the client sells into government, education, healthcare or
      enterprise procurement, or a buyer asks.
- [ ] **Who owns the domain** is written down, with the registrar and who can log in.
      Discovering this during an outage is too late — `incident.md` escalates there.

---

## 6 · Handover

- [ ] **`HANDOFF.md` is filled in.** Every `[BRACKETED]` value replaced. Known issues
      stated honestly — a handoff claiming everything is perfect is not believed, and it
      hides what the next person most needs.
- [ ] **The backup decision is recorded there.** Three days of history and no scheduled
      export is the default state; whether that is accepted or closed, it must be written
      down. See `content-restore.md`.
- [ ] **The plan level is recorded** — Vercel and Sanity support are best-effort on the
      free tiers. If the client's revenue depends on uptime, that conversation happens
      before launch.
- [ ] The client can log into the Studio, and someone has walked them through publishing
      one change end to end.

---

## Go / no-go

**Stop for any of these.** Each is either invisible after launch or expensive to reverse:

| Blocker | Why it stops the launch |
|---|---|
| `seo-geo-audit.md` §1 failing | The site is invisible to search. Nothing else matters |
| Redirect map incomplete, on a replacement site | Search equity is lost at the moment of cutover and does not come back |
| Accessibility statement published without the audit | A dated, public, false claim |
| No content export taken | Three days of history is the entire safety net |
| `NEXT_PUBLIC_SITE_URL` wrong | Every canonical on the site points somewhere unreachable |

Everything else is a judgement call. **Write down what you accepted and why** — the point
of this document is not that every box is ticked, it is that nothing was decided by
accident.

When it passes: `dns-cutover.md`.

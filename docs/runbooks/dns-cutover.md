# DNS cutover

Pointing a client's live domain at the new site. The only procedure here whose mistakes
are visible to the public and to Google.

```bash
export SITE=https://example.com          # the client's real domain
export VERCEL_URL=https://project.vercel.app   # where the site lives until cutover
```

---

## Rehearse this before you use it

**A runbook nobody has walked is a wish.** Buy a throwaway domain, point it at a Vercel
project, and go through every step below once. It costs about ten pounds and an hour, and
it is the difference between reading this calmly on launch day and reading it for the
first time while a client watches.

**Do not cut over on a Friday**, or the day before anyone's holiday. Propagation is slow,
the failure modes are slow, and you want the person who did this available the next
morning.

---

## The abort path — read this first

You cannot un-ring DNS, but you can point it back. Knowing this before you start is what
makes the switch a decision rather than a leap.

- **Reverting is the same operation in reverse:** put the old records back at the
  registrar. It propagates on the TTL you set in step 1, which is why that step exists.
- **The old site must stay running and untouched** until you are certain. Do not cancel
  the old host, do not delete the old server, do not let anyone "tidy up" during the
  window. That is your rollback target.
- **Both sites serve during propagation.** Some visitors reach the new one and some the
  old, for as long as caches hold. This is normal and not a fault. It is also why the old
  site must not show a "we've moved" holding page — half your visitors would see it after
  the move was already done.
- **A reverted cutover is not a failure.** A cutover completed with broken redirects is.

---

## 1 · Lower the TTL — at least 48 hours before

The TTL you are changing *to* is not what governs the wait. Resolvers hold the **old**
value for the **old** TTL, so a record cached at 24 hours stays cached for up to 24 hours
after you lower it.

1. Read the current TTL on the records you will change:
   ```bash
   dig +noall +answer example.com
   dig +noall +answer www.example.com
   ```
   **Expected:** one line per record, the TTL in the second column, in seconds. `86400` is
   a day; `3600` is an hour.

2. Lower every record you intend to change to **300** seconds at the registrar.
   **Expected:** the registrar accepts it. Nothing changes for visitors.

3. Wait out the *original* TTL from step 1 before going further. A day's TTL means a day.
   ```bash
   dig +noall +answer example.com
   ```
   **Expected:** the TTL column now counts down from `300`, not from the old value. Until
   it does, the world has not seen your change.

---

## 2 · Get the site ready — before the domain moves

4. Set `NEXT_PUBLIC_SITE_URL` to the **final** domain in Vercel → Settings → Environment
   Variables → Production, and redeploy.
   **Expected:** the build succeeds and canonicals name the real domain.

   The code enforces this ordering rather than trusting you to remember it:
   `src/lib/seo/site-url.ts` rejects `localhost`, `127.0.0.1` **and any `*.vercel.app`
   host** on a production deployment. You cannot ship production pointing at the preview
   domain, which is exactly the mistake that would otherwise be found weeks later in
   Search Console.

5. Confirm the redirect map is complete **and deployed**.
   **Expected:** every URL from the old-site inventory resolves per `seo-geo-audit.md` §5.

   **Redirects are read from Sanity at build time.** A rule published after the last
   deploy does not exist yet. If the audit finds a redirect missing that you can see in
   the Studio, redeploy before investigating anything else — this is the single most
   common launch-day false alarm.

6. Run the full pre-launch checklist if you have not: `pre-launch-checklist.md`.
   **Expected:** every item ticked, or explicitly accepted with a reason.

7. Add the domain in Vercel → Settings → Domains, and add both the apex and `www`.
   **Expected:** Vercel lists the domain as *Invalid Configuration* and **shows you the
   exact DNS records to create**. Use those values.

   **Do not copy record values from documentation, including this file.** Vercel's
   published IPs and CNAME targets change, and a stale A record is a site that resolves
   to someone else's infrastructure. The dashboard is the source of truth at the moment
   you are standing there.

---

## 3 · The switch

8. At the registrar, replace the old records with the ones Vercel showed you in step 7.
   Change the apex and `www` together — a half-moved domain serves two different sites.
   **Expected:** the registrar accepts them.

9. Watch resolution change. Query a public resolver rather than your own, which may have
   cached:
   ```bash
   dig +short example.com @1.1.1.1
   dig +short www.example.com @1.1.1.1
   ```
   **Expected:** the values from step 7, usually within five minutes at a 300-second TTL.

10. Wait for Vercel to issue the certificate.
    **Expected:** Settings → Domains shows *Valid Configuration* and a certificate. This is
    automatic and usually under a minute once DNS resolves. **Do not proceed while the
    domain shows an error** — a TLS warning on a client's domain is worse than a delay.

---

## 4 · Verify on the real domain

Everything until now proved the *preview* works. These prove the *domain* does.

11. TLS and status:
    ```bash
    curl -sI "$SITE" | head -1
    curl -sI "http://example.com" | head -2
    ```
    **Expected:** a `200` on HTTPS. Plain HTTP returns a `30x` to the `https://` address —
    Vercel does this without configuration.

12. `www` and apex agree. Whichever you chose as canonical, the other must redirect to it,
    not serve a duplicate.
    ```bash
    curl -sI "https://www.example.com" | head -2
    ```
    **Expected:** either a `200` (if `www` is canonical) or a `30x` to the apex. **Not both
    serving a `200`** — that is two sites competing for the same content in search.

13. Run `seo-geo-audit.md` §1, the four that stop everything, against `$SITE`.
    **Expected:** no `x-robots-tag`, `robots.txt` allowing crawling with a `Sitemap:` line
    on the live domain, `<loc>` values on the live domain, absolute canonical.

14. Re-run the redirect sweep from `seo-geo-audit.md` §5 against the **live domain**. It
    passed against the preview; the live domain is what the world will use.
    **Expected:** `301` or `410` for every old URL. No chains, no loops.

15. Load the site as a visitor. Home page, one deep page, one article, on a phone.
    **Expected:** it looks right and nothing is missing.

---

## 5 · Immediately after

16. Restore a sane TTL — **3600** on the records you changed.
    **Expected:** the registrar accepts it. A 300-second TTL is for cutover week, not
    forever; it multiplies DNS queries for no benefit once the address is stable.

17. Verify the domain in Search Console and submit the sitemap:
    `search-console-and-analytics.md`.
    **Expected:** verification succeeds, sitemap accepted with the URL count you expect.

18. Tell the client it is done, and tell them what they will see: some visitors reach the
    old site for another day, search results update over days to weeks, and rankings move
    before they settle.

19. Leave the old site running for **at least a week**. It costs almost nothing and it is
    the only rollback that exists.

---

## When it goes wrong

| Symptom | Almost always | Do this |
|---|---|---|
| Domain still resolves to the old host after an hour | The old TTL had not expired when you switched | Wait. Re-check step 3 — the countdown tells you how long |
| Vercel stuck on *Invalid Configuration* | A record typo, or the registrar added the domain to the value — `www.example.com.example.com` | Compare against Vercel's panel character by character |
| TLS warning in the browser | The certificate has not issued yet | Wait for step 10. If it persists past ten minutes with valid DNS, remove and re-add the domain in Vercel |
| Site loads, every page 404s | The domain is attached to the wrong Vercel project | Settings → Domains on both projects |
| Old URLs 404 instead of redirecting | The redirect map was not deployed after the rules were published | Redeploy. See step 5 |
| Both `www` and apex serve `200` | Only one was configured to redirect | Fix in Vercel → Domains; set one as primary |

**Escalation.** Registrar support owns anything that will not save at the registrar. Vercel
support owns a domain that will not validate with correct records. Neither is fast, which
is why the abort path is at the top of this file rather than the bottom.

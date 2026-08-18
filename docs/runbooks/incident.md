# Incident — the site is down

Triage in order. Each step either finds the problem or rules out a whole class of them, so
do not skip ahead to the interesting one.

```bash
export SITE=https://example.com
```

**Before anything: start a note.** Time, what you saw, what you did. You will not
reconstruct it afterwards, and the write-up is the most useful thing an incident produces.

---

## 0 · Is it actually down?

Two minutes here stops most false alarms. "The site is down" usually arrives from one
person on one network.

1. Load it yourself, on a different network — mobile data, not the office wifi.
   **Expected:** if it loads for you, this is not an outage. It is DNS caching, an ISP, a
   corporate proxy, or one browser's cache. Say so kindly and move on.

2. Check independently:
   ```bash
   curl -sI "$SITE" | head -1
   ```
   **Expected:** a `200`. Anything else, or no response at all, is real — continue.

---

## 1 · What kind of failure is it?

The response tells you which of the next sections to read. Skip the others.

| What you get | Layer | Go to |
|---|---|---|
| No DNS resolution | DNS | §2 |
| Certificate warning | TLS | §2 |
| `404` on every page | Routing — wrong project or domain detached | §3 |
| `500`, or an error page | Application | §3 |
| Correct page, wrong or missing content | Not an outage | `content-restore.md` |
| Slow but working | Not an outage | Note it, deal with it in daylight |

---

## 2 · DNS and TLS

3. Confirm the domain resolves, from a public resolver rather than your own cache:
   ```bash
   dig +short example.com @1.1.1.1
   ```
   **Expected:** the records Vercel gave you. Nothing, or an old host's address, means DNS
   is the problem.

4. If DNS is wrong: was anything changed at the registrar in the last 48 hours? A DNS
   record does not change itself. Domain expiry, an auto-renew failure, or someone
   "tidying up" account records are the usual causes.
   **Expected:** `dns-cutover.md` has the record procedure and the abort path.

5. If DNS resolves but TLS fails, check Vercel → Settings → Domains.
   **Expected:** *Valid Configuration*. If it shows an error, remove and re-add the domain
   so the certificate reissues.

---

## 3 · Application and platform

6. Check the platform before your own code:
   - <https://www.vercel-status.com>
   - <https://status.sanity.io>

   **Expected:** all systems operational. If either is not, you are waiting, not fixing —
   go to §4 and tell people. Do not deploy into a platform incident.

7. What deployed most recently? Vercel → Deployments.
   **Expected:** the current *Production* deployment is one you expected. If it is recent
   and the timing matches the outage, **you have your cause — go to `rollback.md` now** and
   diagnose afterwards with the site back up.

8. If nothing deployed recently, the code did not change, so something it depends on did.
   Read the runtime logs: Vercel → the deployment → **Runtime Logs**.

   > **If you reach for the CLI instead, check two things first.** `vercel logs` is faster
   > than clicking once it works, but the CLI needs `vercel login` *and* `vercel link` —
   > this repository is not linked, there is no `.vercel/` directory, and a fresh clone
   > never has one. Logged out or unlinked, the command stops at an interactive prompt,
   > which is two minutes you do not have and the reason every step here is written for
   > the dashboard. Set both up on a calm day if you want the CLI available on a bad one.
   **Expected:** the error naming the failure. The realistic causes, in order:

   | In the logs | Cause |
   |---|---|
   | `Missing environment variable` | A variable was removed or an environment was reconfigured |
   | Sanity request failures, timeouts | Sanity incident, or the read token was rotated or revoked |
   | `NEXT_PUBLIC_SITE_URL is …` on a build | A production build ran with it unset or pointing at a placeholder |

9. If the site builds but every page 404s, the domain is attached to the wrong project.
   **Expected:** Vercel → Settings → Domains on each project shows exactly one owning it.

---

## 4 · Tell people, while it is still broken

Communication is part of the fix. A client who hears nothing assumes nobody noticed.

10. Tell the client three things, and no more: **what is broken, that you are on it, and
    when you will next update them.** Do not speculate about cause, and do not give a
    restoration estimate you cannot keep.

11. Update at the interval you promised, even when there is nothing new. "Still working on
    it, next update in thirty minutes" is information.

12. When it is fixed, say what happened in one paragraph without jargon, and what stops it
    recurring. If nothing stops it recurring, say that instead of inventing something.

---

## 5 · Afterwards

13. Write it up while it is fresh: what broke, how long, what fixed it, and **what would
    have caught it earlier.**

14. If CI could have caught it and did not, that is the finding. Four checks block every
    merge (`deploy.md`); an outage that passed them is a gap in the gates, and closing it
    is worth more than the fix was.

15. If the cause was a platform incident, there is nothing to fix in this repository.
    Record it anyway — three in a quarter is a hosting conversation, not bad luck.

---

## Escalation

| Layer | Who | Reality |
|---|---|---|
| Application, deploys, domains | Vercel support | On Hobby, community support with no response-time commitment |
| Content, API, Studio | Sanity support | Free plan is community support |
| DNS, domain expiry | The registrar | Whoever holds the domain — record who in `HANDOFF.md` |

**Both support paths above are best-effort on the plans this starter assumes.** If a
client's revenue depends on the site being up, that is a plan decision to have made before
the incident. Note it in `HANDOFF.md` under known issues, so the conversation happens in
daylight rather than during an outage.

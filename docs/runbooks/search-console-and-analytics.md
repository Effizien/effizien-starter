# Search Console and GA4 — wiring a new site

Run this **on launch day, after DNS has cut over**, not before. Verifying a property on a
domain that does not resolve yet fails in a way that looks like a permissions problem and
wastes an hour.

Time: about 30 minutes, most of it waiting for DNS.

**Prerequisites:** the site is live on its real domain over HTTPS · you have access to the
client's Google account, or they are on the call · `NEXT_PUBLIC_SITE_URL` is set to the
production domain in Vercel.

> **Whose account?** The client's, always — created by them or with them present. A
> property under an agency account is one of the two things a departing agency can hold
> hostage (the other is the domain). Add yourself as a user; never be the owner.

---

## 1. Verify the domain in Search Console

1. Go to `search.google.com/search-console` → **Add property** → **Domain** (the left
   option, not URL prefix).

   Domain covers `http`, `https`, `www` and every subdomain in one property. URL prefix
   does not, and a site verified only as `https://www.example.com` reports nothing for
   `https://example.com`.

2. Google shows a `TXT` record. Add it at the client's DNS provider.

   If the domain is on Vercel: Vercel dashboard → Domains → the domain → **DNS Records**.

3. Wait for propagation, then confirm from a terminal:

   ```bash
   dig +short TXT example.com
   ```

   **Expected:** the `google-site-verification=…` string appears. If not, wait — TTL is
   usually 300–3600 seconds. Do not re-issue the record; a second one does not help and
   Google reads whichever it finds.

4. Back in Search Console → **Verify**.

## 2. Submit the sitemap

1. Search Console → **Sitemaps** → enter `sitemap.xml` → **Submit**.

   The site generates it from published content — see `src/app/sitemap.ts`. Nothing needs
   to be uploaded.

2. **Expected:** status *Success* and a discovered-URL count within a day. "Couldn't
   fetch" almost always means `NEXT_PUBLIC_SITE_URL` is wrong in Vercel, so the sitemap is
   advertising URLs on a domain Google cannot reach. Check it before assuming a Google
   problem:

   ```bash
   curl -s https://example.com/sitemap.xml | head -5
   ```

   The `<loc>` values must be the live domain. If they say `localhost` or a
   `*.vercel.app` address, fix the environment variable and redeploy.

## 3. Confirm the site is actually indexable

The one check worth doing by hand, because the failure is silent and expensive.

```bash
curl -sI https://example.com | grep -i "x-robots-tag"
```

**Expected: no output.** An `X-Robots-Tag: noindex` here means the deploy is not being
treated as production — `VERCEL_ENV` is not `production`, which happens if the site is
being served from a preview deployment rather than a promoted one.

```bash
curl -s https://example.com/robots.txt
```

**Expected:** `Allow: /` and a `Sitemap:` line pointing at the live domain. If it says
`Disallow: /`, the same cause: the deployment is not production. **Do not "fix" this by
editing `robots.ts`** — the file is correct and the deployment is wrong.

## 4. Create the GA4 property

1. `analytics.google.com` → Admin → **Create property**. Set the reporting time zone and
   currency to the client's, not yours — both are painful to change later and neither
   rewrites historical data.
2. Add a **Web** data stream for the production domain. Copy the measurement ID
   (`G-XXXXXXXXXX`).
3. Enhanced measurement is on by default. Leave it on; it covers outbound clicks, scroll
   and file downloads without any code.

## 5. Install GA4

Set the measurement ID in Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

**Production scope only.** Preview deploys sharing the production stream pollute the
client's reporting with your own testing, and it is not separable afterwards.

> **Not yet implemented.** WP5 wired search visibility, not analytics — no component reads
> this variable today. Use `@next/third-parties`' `GoogleAnalytics` component when the
> analytics module lands; it handles App Router navigation events, which a hand-rolled
> `gtag` snippet does not. Recorded here so the runbook is complete and the gap is
> visible rather than assumed filled.

## 6. Link GA4 to Search Console

GA4 → Admin → **Product links** → **Search Console links** → link the property.

This is the step everyone skips. Without it, GA4 cannot show which queries brought people
to the site, which is the single report a client asks for most.

## 7. Cookie consent

If the client has EU or UK visitors, GA4 needs consent before it sets cookies. That is a
legal question, not a technical one, and it is out of scope here — but **do not let a site
go live with GA4 firing unconditionally on an EU-facing business.** Raise it before launch
and get a decision in writing.

---

## Verification, one week later

Put this in the calendar at launch; nobody remembers otherwise.

| Check | Where | Expected |
|---|---|---|
| Pages indexed | Search Console → Pages | A rising count. Zero after a week means step 3 failed |
| Sitemap read | Search Console → Sitemaps | *Success*, discovered count ≈ published pages |
| Traffic arriving | GA4 → Reports → Realtime | Non-zero during a visit you make yourself |
| Queries appearing | Search Console → Performance | Sparse is normal at one week; empty at one month is not |

## If pages are not being indexed

In order — most common first:

1. **Check `robots.txt` and the `X-Robots-Tag` header** (step 3). This is the cause the
   large majority of the time.
2. **Check the canonical tag** on an affected page. If it points at another domain, an
   editor has filled in the Canonical URL field under *SEO & sharing → Advanced*. That
   field is for republished content only; empty is almost always right.
3. **Check the page is not hidden.** *SEO & sharing → Advanced → Search engines →
   Hidden* removes a page from Google and from the sitemap. It is the intended behaviour
   for thank-you pages and the surprising behaviour everywhere else.
4. **Use the URL Inspection tool** on one affected page. It reports what Google actually
   saw, which beats guessing.

Indexing is not guaranteed or instant even when everything is correct. A new site takes
weeks. Tell clients that at launch, not when they ask in week two.

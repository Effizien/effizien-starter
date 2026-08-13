# SEO and GEO audit

Run before launch, and again a week after. Most checks are one command; the ones that
are not say so.

This becomes a Claude Code skill in WP8 — which is why every check states its **expected
output** rather than "verify it looks right". A check an agent cannot evaluate is a check
nobody runs twice.

Set the domain once:

```bash
export SITE=https://example.com
```

---

## 1. The four that stop everything

Failures here mean the site is invisible. Nothing further down matters until they pass.

| # | Check | Command | Expected |
|---|---|---|---|
| 1.1 | No `noindex` header | `curl -sI $SITE \| grep -i x-robots-tag` | **No output** |
| 1.2 | robots allows crawling | `curl -s $SITE/robots.txt` | `Allow: /`, and a `Sitemap:` line on the live domain |
| 1.3 | Sitemap resolves | `curl -s $SITE/sitemap.xml \| head -5` | `<loc>` values on the live domain — not `localhost`, not `*.vercel.app` |
| 1.4 | Home page canonical | see below | An absolute URL on the live domain |

```bash
curl -s $SITE | grep -o '<link rel="canonical"[^>]*>'
```

**1.1 and 1.2 failing together** means the deployment is not being treated as production
(`VERCEL_ENV`). The code is right; the deploy is wrong. Promote the build in Vercel rather
than editing `src/app/robots.ts`.

## 2. Per-page metadata

Run against a representative page — a normal page, an article, and the home page.

```bash
curl -s $SITE/some-page | grep -oE '<title>[^<]*|<meta name="description"[^>]*|<link rel="canonical"[^>]*'
```

- [ ] **Title** present, unique across pages, and ends with the site name — the ` · Site
      name` suffix comes from the root layout template, never typed per page
- [ ] **Description** present. If it is identical on every page, `siteSettings.description`
      is doing all the work and no page has written its own
- [ ] **Canonical** absolute, on the live domain, and self-referencing unless the page
      deliberately republishes something from elsewhere
- [ ] **No stega characters.** Invisible on the page, real inside `<title>`, and copied
      into every search result:

```bash
curl -s $SITE/some-page | grep -oP '<title>.*?</title>' | grep -cP '[\x{E0000}-\x{E007F}]'
```

**Expected: `0`.** Anything else means a metadata fetch is missing `stega: false`.

## 3. Social sharing

- [ ] `og:title`, `og:description`, `og:url`, `og:image` present
- [ ] `og:url` matches the canonical exactly
- [ ] `og:image` is an absolute URL that returns `200` and is at least 1200×630
- [ ] `twitter:card` is `summary_large_image` where an image exists

```bash
curl -s $SITE | grep -oE '<meta property="og:[^>]*'
curl -sI "$(curl -s $SITE | grep -oP '(?<=property="og:image" content=")[^"]*')" | head -1
```

Then paste the URL into the LinkedIn Post Inspector and Facebook Sharing Debugger. Both
cache aggressively; the debugger is also how you force a re-scrape after a fix.

## 4. Structured data

```bash
curl -s $SITE/blog/some-article | grep -o 'application/ld+json' | wc -l
```

**Expected: 3** on an article — Organization, Article, BreadcrumbList.

- [ ] Validate at `validator.schema.org` and Google's Rich Results Test
- [ ] **`Article.headline` matches the visible `h1`, not the SEO override.** This is the
      one Google actually penalises. If an editor set a different search-result title,
      the two must still differ in the right direction — `<title>` takes the override,
      `headline` keeps the page's own title
- [ ] `publisher.@id` resolves to an Organization emitted on the same page
- [ ] No `FAQPage` markup for questions that are not visible on the page
- [ ] The last breadcrumb item has no `item` URL

## 5. Redirects

> ⚠️ **Not yet implemented.** WP5 chunk 5 builds the redirect map and the `410` route.
> These checks are written now so the gap is visible rather than assumed filled.

- [ ] Every URL in the client's old-site inventory returns `301` to a live page, or `410`
- [ ] No redirect chains — one hop, not two
- [ ] No redirect loops
- [ ] `/old-page` → the closest equivalent page, **not** the homepage. A visitor dropped
      on the homepage starts their search over, and Google reads it as a soft 404

```bash
while read -r url; do printf '%s → %s\n' "$url" "$(curl -sI -o /dev/null -w '%{http_code} %{redirect_url}' "$SITE$url")"; done < old-urls.txt
```

**This is the highest-stakes section of the whole audit on a replacement site.** Losing
search equity at launch is the most damaging and most preventable failure in this
business.

## 6. GEO surface

- [ ] `curl -s $SITE/llms.txt` returns a Markdown map with absolute URLs
- [ ] `curl -s $SITE/llms-full.txt` returns article full text
- [ ] Neither lists a page marked *Hidden* in the Studio
- [ ] `robots.txt` matches the policy the client actually agreed to — see
      `src/lib/seo/ai-crawlers.ts` before changing anything here

**Say this to the client, in these words.** Nothing in this section has a demonstrated
effect on visibility in AI answers. `llms.txt` has no confirmed consumer; Google's John
Mueller compared it to the keywords meta tag. We ship it because it costs a build step
and is durable — not because it is a proven lever. Anyone telling them otherwise is
selling something nobody has measured.

## 7. Semantic HTML

Automated checks catch roughly 30–40% of real accessibility barriers, and the overlap
with SEO is exactly the structural part. WP6 owns the full gate; these are the ones that
also affect how a page is understood.

- [ ] Exactly one `h1` per page
- [ ] Heading levels descend without skipping
- [ ] `<html lang>` is set and correct
- [ ] One `<main>` landmark
- [ ] Every image has `alt`, or `alt=""` when decorative

```bash
curl -s $SITE/some-page | grep -c '<h1'
```

**Expected: `1`.**

## 8. A week after launch

| Check | Where | Expected |
|---|---|---|
| Pages indexed | Search Console → Pages | Rising. Zero after a week means section 1 failed |
| Sitemap status | Search Console → Sitemaps | *Success*, count ≈ published pages |
| Coverage errors | Search Console → Pages → *Why pages aren't indexed* | No "Excluded by 'noindex' tag" on pages that should be public |
| Queries | Search Console → Performance | Sparse at one week is normal; empty at one month is not |

---

## What this audit does not do

Named so nobody mistakes a pass for a guarantee.

- **It does not measure rankings.** It verifies that a site is technically capable of
  ranking. Those are different claims and only one of them is honest to make.
- **It does not check content quality**, which is the larger part of whether a page ever
  ranks.
- **It does not check backlinks or authority.**
- **It does not verify AI-answer visibility.** No reliable way to do so exists that we
  are willing to charge a client for (D-007).

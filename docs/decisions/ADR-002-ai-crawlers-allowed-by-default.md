# ADR-002 — AI crawlers are allowed by default

Date: 2026-08-12 · Status: **Accepted**

## Context

`robots.txt` has to take a position on AI crawlers, and "no position" is itself a
position — an absent directive means allowed.

The client-facing framing is usually "should we block AI from scraping our site?", which
bundles three separate questions that have different answers. The taxonomy is documented
in `src/lib/seo/ai-crawlers.ts`; the parts that drove this decision:

- **Training crawlers and search crawlers are different agents.** `GPTBot` gathers
  training data; `OAI-SearchBot` powers ChatGPT's search feature — the one that cites and
  links to a site. Blocking the first does nothing to the second. Most published "block
  AI" advice conflates them, and a client following it removes themselves from the
  surface they wanted to appear in without any signal that it happened.
- **`Google-Extended` does not control AI Overviews.** It governs Gemini training and
  grounding. AI Overviews are built from the ordinary Googlebot index. The only opt-out
  is `nosnippet` / `max-snippet:0`, which also removes the normal search snippet. **There
  is no setting that means "index me but keep me out of AI Overviews."**
- **`robots.txt` is advisory.** Well-behaved crawlers honour it; nothing enforces it, and
  several AI crawlers have been credibly documented ignoring it. Real enforcement is a
  WAF or edge rule.

The sites this starter produces are marketing sites for small businesses. Their problem
is being found, not being copied. The instinct to block AI crawlers is inherited from
publishers protecting paid archives — the opposite situation.

## Decision

Allow all crawlers by default. `src/app/robots.ts` emits `Allow: /` for `*` in
production, with `/api/` disallowed.

A ready-made block list for **training-only** crawlers lives in
`src/lib/seo/ai-crawlers.ts` as `trainingCrawlerRules()`, one line to switch on, with a
note on each agent. It blocks training while leaving ChatGPT search, Claude search,
Perplexity and Google free to index and cite.

Preview deployments are the exception and disallow everything — see
`src/app/robots.ts`, and `next.config.ts` for the `noindex` header that pairs with it.

## Consequences

**Easier.** A client site is visible to every surface that could send it traffic or cite
it, which is what a marketing site is for. Turning the policy around is one line and does
not require understanding the taxonomy first — the file explains it at the point of
change.

**Harder, and knowingly accepted:**

- **The site's content is available as training data.** That is a real cost. It is
  accepted because these clients' content has little standalone value as a corpus, and
  because the alternative costs citation visibility that does have measurable value.
- **This is a decision made on the client's behalf** by a default they did not choose.
  Mitigated by naming it in the launch conversation rather than leaving it in a config
  file — but a default is still a default, and most clients will never revisit it.
- **We cannot promise the block works even when switched on**, because `robots.txt` is
  advisory. Any client who genuinely needs enforcement needs a WAF, which is a different
  conversation and a different bill.

## Revisit trigger

**Any** of:

1. **A client asks to block AI training in writing.** Switch it on for that site — this
   ADR is a default, not a policy, and per-site divergence is expected. Record it in that
   site's own `docs/decisions/`.
2. **A client's content is found republished verbatim** in an AI product in a way that
   costs them traffic or attribution. That is the observable event that changes the
   cost-benefit, and it changes it for every site we run.
3. **A provider ships a crawl-control that is actually enforced** rather than advisory —
   a signed or authenticated mechanism, or one backed by a licensing agreement. That
   would make "blocking" a real option rather than a request, and this decision was made
   in a world where it is not.
4. **The starter is used for a publisher** whose archive is the product. The reasoning
   above does not transfer; redo it from the beginning.

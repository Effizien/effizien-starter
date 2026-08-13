/** Which AI crawlers exist, what each one actually controls, and the policy.
 *
 * A module of its own rather than a constant in `app/robots.ts`, for two
 * reasons: Next's metadata route files are validated for their exports and are
 * not a good home for shared constants, and this list is policy a client may
 * ask to see. It should be readable without opening a route file.
 *
 * ## Default: allow everything
 *
 * For a marketing site, being read is the point. The instinct to block AI
 * crawlers comes from publishers protecting paid content — the opposite problem
 * to a business trying to be found.
 *
 * ## Three distinctions almost every "block AI" guide gets wrong
 *
 * Getting these wrong removes a client from the surface they wanted to be cited
 * in, and nothing tells them it happened.
 *
 * **1. Training crawlers are not search crawlers.** Separate agents, separate
 * user-agent strings, separate consequences:
 *
 *     OpenAI      GPTBot           training
 *                 OAI-SearchBot    ChatGPT's search surface — the one that cites you
 *                 ChatGPT-User     fetches a page when a user asks it to
 *     Anthropic   ClaudeBot        training
 *                 Claude-SearchBot search
 *                 Claude-User      user-initiated fetch
 *     Perplexity  PerplexityBot    its index
 *                 Perplexity-User  user-initiated fetch
 *
 * Blocking `GPTBot` does not remove you from ChatGPT's citations. Blocking
 * `OAI-SearchBot` does. People reach for the first intending the second and
 * achieve neither.
 *
 * **2. `Google-Extended` does not control AI Overviews.** It governs Gemini
 * training and grounding. AI Overviews are built from the ordinary Googlebot
 * index, so blocking `Google-Extended` changes nothing about them. The only
 * opt-out is `nosnippet` / `max-snippet:0`, which also removes the normal
 * search snippet — usually a far larger loss. **There is no setting that means
 * "index me but keep me out of AI Overviews."** Say so when a client asks,
 * because they will.
 *
 * **3. `Applebot-Extended` is training; `Applebot` is Siri and Spotlight.**
 * Same trap as Google's pair, and the naming actively invites it.
 *
 * ## What robots.txt is not
 *
 * A request, not a control. Well-behaved crawlers honour it, nothing enforces
 * it, and several AI crawlers have been credibly documented ignoring it.
 * Enforcement is a WAF or edge rule — Cloudflare bot controls, or Vercel's
 * firewall. Never sell a text file as a blocking mechanism.
 */

/** Training-only crawlers.
 *
 * Blocking every agent here stops the site being used as training data while
 * leaving ChatGPT search, Claude search, Perplexity and Google free to index
 * and cite it. That is the combination most clients mean when they say they
 * want to "block AI".
 *
 * Written out with a note each, rather than generated, so that what a site asks
 * for stays legible and removing one is a decision rather than an edit to a
 * loop.
 */
export const TRAINING_CRAWLERS = [
  'GPTBot', // OpenAI training. Not ChatGPT search.
  'ClaudeBot', // Anthropic training.
  'Google-Extended', // Gemini training and grounding. Not Search, not AI Overviews.
  'Applebot-Extended', // Apple Intelligence training. Not Siri or Spotlight.
  'CCBot', // Common Crawl — feeds many models at once.
  'Bytespider', // ByteDance.
  'meta-externalagent', // Meta.
  'Amazonbot', // Amazon.
] as const

/** `robots.txt` rules that block training while staying citable.
 *
 * Spread into the `rules` array in `app/robots.ts` to switch the policy on:
 *
 *     rules: [ { userAgent: '*', allow: '/', disallow: ['/api/'] },
 *              ...trainingCrawlerRules() ],
 */
export function trainingCrawlerRules(): { userAgent: string; disallow: string }[] {
  return TRAINING_CRAWLERS.map((userAgent) => ({ userAgent, disallow: '/' }))
}

/**
 * Secret detection ruleset for the effizien starter.
 *
 * Kept as a JS module rather than JSON so patterns are real RegExp literals:
 * escaped-regex-inside-JSON-strings is the single most common source of silent
 * scanner bugs, and a reviewer cannot eyeball `\\b(?:sk|rk)_` for correctness.
 *
 * TIERS
 *   1 (BLOCK) — structurally unambiguous. Denied when the destination is
 *               git-visible, including .env.example. Downgraded to ASK inside
 *               documentation paths.
 *   2 (ASK)   — real but ambiguous. Never auto-denied; a human decides.
 *
 * Every `verified` flag records whether the token FORMAT was confirmed against
 * the vendor's own documentation. Scanner-derived formats (gitleaks/trufflehog
 * agreeing with each other) are marked false — they are good signal, not proof,
 * and should not be tightened without a primary source.
 *
 * NOTE: Sanity, Vercel, Resend and Statsig have NO rule in gitleaks' default
 * ruleset. Running gitleaks in CI does not cover this stack. These four are
 * hand-written here and are the reason this file exists.
 */

export const TIER = { BLOCK: 1, ASK: 2 }

/** Identifiers that are public by construction — never treat their value as a secret. */
export const PUBLIC_IDENTIFIERS = [
  /^NEXT_PUBLIC_SANITY_PROJECT_ID$/,
  /^NEXT_PUBLIC_SANITY_DATASET$/,
  /^NEXT_PUBLIC_SANITY_API_VERSION$/,
  /^NEXT_PUBLIC_SITE_URL$/,
  /^SANITY_STUDIO_[A-Z0-9_]*$/,
  /^VERCEL_(?:URL|ENV|REGION|GIT_[A-Z_]+|PROJECT_PRODUCTION_URL|DEPLOYMENT_ID)$/,
]

/**
 * Placeholder values. Matched against the captured secret itself, not the line.
 * Sourced from the vendors' own documentation examples — these are exactly the
 * strings a developer copies out of a quickstart.
 */
export const PLACEHOLDER_VALUES = [
  /^$/,
  /^[xX]{3,}$/,
  /^\*{3,}$/,
  /^\.{3,}$/,
  /^<.+>$/,
  /^\{\{.*\}\}$/,
  /^%[A-Za-z_]+%$/,
  /^\$\{?[A-Za-z_][A-Za-z0-9_]*\}?$/,
  /^(?:changeme|your[-_].*|.*[-_]here|dummy|fake|example|redacted|placeholder|todo|sample|test|secret|password)$/i,
  // Vendor doc placeholders, verbatim
  /^server-secret-key$/,
  /^secret-key$/,
  /^re_xxxxxxxxx$/,
  /^AIzaSyabcdefghijklmnopqrstuvwxyz1234567$/,
  /EXAMPLE$/,
]

/** Paths whose contents are generated, vendored, or are this ruleset itself. */
export const SKIP_PATHS = [
  /(?:^|\/)node_modules\//,
  /(?:^|\/)\.pnpm-store\//,
  /(?:^|\/)\.next\//,
  /(?:^|\/)\.turbo\//,
  /(?:^|\/)\.vercel\//,
  /(?:^|\/)(?:dist|build|out|coverage)\//,
  /(?:^|\/)\.git\//,
  /\.(?:map|lockb)$/,
  /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lock|npm-shrinkwrap\.json|deno\.lock)$/,
  // Self-exclusion: this file and the guard are full of token-shaped regexes.
  // gitleaks excludes gitleaks.toml for precisely this reason.
  /(?:^|\/)\.claude\/hooks\//,
]

/** Documentation. Tier-1 findings here become ASK rather than DENY. */
export const DOC_PATHS = [
  /\.mdx?$/,
  /(?:^|\/)docs\//,
  /(?:^|\/)prompts\//,
  /(?:^|\/)\.claude\/rules\//,
  /(?:^|\/)(?:README|CHANGELOG|HANDOFF|AGENTS|CLAUDE)\.md$/i,
]

/** Value shapes that are structurally never credentials. */
export const BENIGN_VALUE_SHAPES = [
  /^[0-9a-f]{7,64}$/i, // git SHA, md5, sha1, sha256 hex
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
  /^sha(?:512|384|256|1)-[A-Za-z0-9+/]+={0,2}$/, // SRI / npm integrity
  /^[0-9a-f]{40}-\d+x\d+\.(?:png|jpe?g|webp|svg|gif)$/i, // Sanity asset filename
  /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?$/, // semver
  /^[A-Za-z_$][A-Za-z0-9_$.]*$/, // bare identifier / member access
  /^(?:process\.env|import\.meta\.env|os\.environ|Deno\.env)\b/,
]

export const PATTERNS = [
  // ---------------------------------------------------------------------
  // TIER 1 — structurally unambiguous
  // ---------------------------------------------------------------------
  {
    id: 'pem-private-key',
    label: 'PEM private key',
    tier: TIER.BLOCK,
    verified: true,
    scanBash: true,
    // The {64,} body is load-bearing: it is what stops a docs page that prints
    // only the "-----BEGIN RSA PRIVATE KEY-----" header line from firing.
    // Requiring the literal PRIVATE correctly excludes PUBLIC KEY and CERTIFICATE.
    re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----[\s\S]{64,}?-----END (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/g,
    // A PEM block is a secret regardless of where it lands.
    ignoreDocPaths: true,
  },
  {
    id: 'sanity-api-token',
    label: 'Sanity API token',
    tier: TIER.BLOCK,
    verified: false, // Sanity publishes no formal grammar; length observed 80-81
    scanBash: true,
    minEntropy: 3.5,
    // Deliberately a RANGE, not trufflehog's {79}: that pattern fails to match
    // the 80-char token printed in Sanity's own HTTP-auth documentation.
    re: /(?<![A-Za-z0-9])sk[A-Za-z0-9]{60,120}(?![A-Za-z0-9])/g,
  },
  {
    id: 'anthropic-api-key',
    label: 'Anthropic API key',
    tier: TIER.BLOCK,
    verified: false, // scanner-derived; Anthropic publishes no key format
    scanBash: true,
    re: /(?<![A-Za-z0-9_-])sk-ant-(?:api03|admin01)-[A-Za-z0-9_-]{93}AA(?![A-Za-z0-9_-])/g,
  },
  {
    id: 'openai-api-key',
    label: 'OpenAI API key',
    tier: TIER.BLOCK,
    verified: false, // openai.com returned 403; T3BlbkFJ marker independently decoded
    scanBash: true,
    // T3BlbkFJ is base64 for "OpenAI" — an embedded self-identifier, and the
    // single most reliable false-positive killer in this whole file.
    re: /(?<![A-Za-z0-9_-])sk-(?:proj|svcacct|service|admin)-[A-Za-z0-9_-]{20,120}T3BlbkFJ[A-Za-z0-9_-]{20,120}(?![A-Za-z0-9_-])|(?<![A-Za-z0-9_-])sk-[A-Za-z0-9]{20}T3BlbkFJ[A-Za-z0-9]{20}(?![A-Za-z0-9_-])/g,
  },
  {
    id: 'github-token',
    label: 'GitHub token',
    tier: TIER.BLOCK,
    verified: false, // prefixes vendor-documented; lengths scanner-derived
    scanBash: true,
    re: /(?<![A-Za-z0-9_])(?:gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59})(?![A-Za-z0-9])/g,
  },
  {
    id: 'aws-access-key-id',
    label: 'AWS access key ID',
    tier: TIER.BLOCK,
    verified: false, // prefixes vendor-documented; length/charset scanner-derived
    scanBash: true,
    re: /(?<![A-Za-z0-9])(?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z0-9]{16}(?![A-Za-z0-9])/g,
  },
  {
    id: 'stripe-live-key',
    label: 'Stripe live/restricted/webhook key',
    tier: TIER.BLOCK,
    verified: true,
    scanBash: true,
    // pk_live_ and pk_test_ are deliberately absent — Stripe documents
    // publishable keys as safe to expose in front-end code.
    re: /(?<![A-Za-z0-9_])(?:(?:sk|rk)_live_[A-Za-z0-9]{10,99}|sk_org_[A-Za-z0-9]{10,99}|whsec_[A-Za-z0-9]{24,64})(?![A-Za-z0-9])/g,
  },
  {
    id: 'vercel-oauth-token',
    label: 'Vercel access/refresh token',
    tier: TIER.BLOCK,
    verified: true,
    scanBash: true,
    re: /(?<![A-Za-z0-9_])vc[ar]_[A-Za-z0-9]{40,80}(?![A-Za-z0-9])/g,
  },
  {
    id: 'google-api-key',
    label: 'Google API key',
    tier: TIER.BLOCK,
    verified: false, // one documented example; length inferred
    scanBash: true,
    minEntropy: 4,
    re: /(?<![A-Za-z0-9_-])AIza[A-Za-z0-9_-]{35}(?![A-Za-z0-9_-])/g,
    // A referrer-restricted Maps key in NEXT_PUBLIC_ is a legitimate pattern,
    // so this rule alone drops to ASK there. See guard.mjs applyPublicPrefix().
    askWhenPublicPrefixed: true,
  },
  {
    id: 'statsig-server-key',
    label: 'Statsig server/console key',
    tier: TIER.BLOCK,
    verified: false, // prefixes from SDK docs placeholders; length unverified
    scanBash: true,
    minEntropy: 3.5,
    // No second hyphen: that is what stops `secret-key-name`, k8s manifests and
    // kebab-case CSS classes from firing. client-* keys are documented as safe.
    re: /(?<![A-Za-z0-9-])(?:secret|console)-[A-Za-z0-9]{20,}(?![A-Za-z0-9-])/g,
  },
  {
    id: 'slack-webhook',
    label: 'Slack incoming webhook URL',
    tier: TIER.BLOCK,
    verified: true,
    scanBash: true,
    re: /https:\/\/hooks\.slack\.com\/(?:services|workflows|triggers)\/T[A-Z0-9]{6,}\/[AB][A-Z0-9]{6,}\/[A-Za-z0-9]{20,30}/g,
  },
  {
    id: 'discord-webhook',
    label: 'Discord webhook URL',
    tier: TIER.BLOCK,
    verified: true,
    scanBash: true,
    re: /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api(?:\/v\d+)?\/webhooks\/\d{17,20}\/[A-Za-z0-9_-]{60,90}/g,
  },

  // ---------------------------------------------------------------------
  // TIER 2 — real but ambiguous. Always ASK, never auto-deny.
  // ---------------------------------------------------------------------
  {
    id: 'jwt',
    label: 'JSON Web Token',
    tier: TIER.ASK,
    verified: true,
    scanBash: false, // far too noisy on command lines
    // eyJ is just base64 for '{"' — every base64-encoded JSON object matches.
    // VERCEL_OIDC_TOKEN in .env.local is a legitimate instance of this.
    re: /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}(?![A-Za-z0-9_-])/g,
    expiredIsBenign: true,
  },
  {
    id: 'stripe-test-key',
    label: 'Stripe test key',
    tier: TIER.ASK,
    verified: true,
    scanBash: false,
    re: /(?<![A-Za-z0-9_])(?:sk|rk)_test_[A-Za-z0-9]{10,99}(?![A-Za-z0-9])/g,
  },
  {
    id: 'resend-api-key',
    label: 'Resend API key',
    tier: TIER.ASK,
    verified: false, // Resend publishes only the placeholder `re_xxxxxxxxx`
    scanBash: false,
    minEntropy: 3.5,
    // `re_` is three characters and a common identifier stem (re_export,
    // re_render, re_match). Length floor plus entropy is the only thing
    // keeping this usable at all — hence ASK, never BLOCK.
    re: /(?<![A-Za-z0-9_])re_[A-Za-z0-9_]{24,60}(?![A-Za-z0-9])/g,
  },
  {
    id: 'aws-secret-access-key',
    label: 'AWS secret access key',
    tier: TIER.ASK,
    verified: false,
    scanBash: false,
    // Keyword-gated on purpose: a bare [A-Za-z0-9/+=]{40} matches base64
    // SHA-256, every npm integrity body, and most JWT signatures.
    re: /aws[_.-]?(?:secret|access)[_.-]?(?:access[_.-]?)?key[^\n]{0,30}?["'`]([A-Za-z0-9/+=]{40})["'`]/gi,
  },
  {
    id: 'vercel-legacy-token',
    label: 'Vercel legacy personal token',
    tier: TIER.ASK,
    verified: false,
    scanBash: false,
    // 24 alphanumerics is the shape of a thousand innocuous IDs. Never run
    // this without the proximity keyword.
    re: /vercel[_a-z]{0,12}(?:token|key)["'\s:=]{1,20}([A-Za-z0-9]{24})(?![A-Za-z0-9])/gi,
  },
]

/**
 * Generic high-entropy assignment. Separated from PATTERNS because it needs the
 * full filter chain in guard.mjs rather than a single regex test.
 *
 * Requires a QUOTED STRING LITERAL on the right-hand side. That one requirement
 * is what stops `const token = process.env.SANITY_API_READ_TOKEN` — the highest
 * volume false positive in a Next.js + Sanity repo, appearing three times in a
 * single file of Sanity's own recommended client setup.
 */
export const GENERIC_ASSIGNMENT =
  /\b(?<id>[A-Za-z0-9_]{0,40}(?:TOKEN|SECRET|PASSWORD|PASSWD|APIKEY|API_KEY|PRIVATE_KEY|CREDENTIALS?))\b\s*(?:=|:|=>|:=)\s*(?<q>["'`])(?<val>[^"'`\n]{16,200})\k<q>/g

/** Identifier prefixes that suppress the generic rule (public by construction). */
export const GENERIC_SUPPRESS_PREFIXES = /^(?:NEXT_PUBLIC_|SANITY_STUDIO_|VITE_|STORYBOOK_|PUBLIC_)/

/**
 * Bash intent rules. These do not detect secrets at all — they detect a secret
 * ENTERING THE GIT INDEX, which is the actual failure mode and is far higher
 * signal than running an entropy scanner over a command line.
 */
export const BASH_INTENT_RULES = [
  {
    id: 'git-add-env',
    label: 'staging an environment file',
    tier: TIER.BLOCK,
    re: /\bgit\s+add\b(?:\s+-[A-Za-z-]+)*\s+[^\n;&|]*\.env(?![.\w-]*\.(?:example|template|sample)\b)/,
    advice:
      'Environment files must never be staged. If this file holds no secrets, rename it to .env.example.',
  },
  {
    id: 'git-add-force-ignored',
    label: 'force-adding a gitignored file',
    tier: TIER.BLOCK,
    re: /\bgit\s+add\b[^\n;&|]*\s(?:-f|--force)\b/,
    advice:
      '`git add -f` overrides .gitignore, which is the mechanism that keeps secrets out of this repo.',
  },
  {
    id: 'git-rm-cached-gitignore',
    label: 'removing .gitignore from the index',
    tier: TIER.BLOCK,
    re: /\bgit\s+rm\b[^\n;&|]*--cached[^\n;&|]*\.gitignore/,
    advice: 'Removing .gitignore from the index exposes every ignored file on the next `git add -A`.',
  },
  {
    id: 'read-env-file',
    label: 'reading an environment file into context',
    tier: TIER.ASK,
    re: /\b(?:cat|bat|less|more|head|tail|xxd|od)\s+[^\n;&|]*\.env(?![.\w-]*\.(?:example|template|sample)\b)/,
    advice:
      'Reading a secret into the transcript is how it later gets echoed into a tracked file. Confirm only if you need the value.',
  },
]

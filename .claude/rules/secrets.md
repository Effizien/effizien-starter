# Secret handling

**This rule deliberately carries no `paths:` frontmatter, so it loads every session.**

Path-scoped rules trigger when Claude *reads* a file matching their glob. Creating a
brand-new file triggers nothing — there is no read before a write to a file that does
not exist yet. Since most secret leaks happen in newly created files, scoping this rule
to a path would disable it exactly when it matters. It is kept short to earn its place
in every context window.

## The rule

- Real credential values live in `.env.local` only. That file is gitignored and must
  stay that way.
- `.env.example` is the only environment file that may be committed. It carries variable
  **names** and obviously-fake placeholders — never a real value, not even briefly.
- Reference secrets as `process.env.NAME`. Never inline a literal credential in source,
  config, JSON, or a comment.
- Never paste a credential into a shell command. Command arguments are readable by other
  processes via `ps`, are written to shell history, and are captured in the transcript.
  Use a tool's interactive prompt or stdin flag instead.

## `NEXT_PUBLIC_` is an escalation, not an exemption

Next.js inlines `NEXT_PUBLIC_*` values into the client bundle at build time. A secret
placed there ships to every visitor and cannot be revoked by redeploying — only by
rotating the credential.

Public by construction, safe to expose:
`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`,
`NEXT_PUBLIC_SANITY_API_VERSION`, `SANITY_STUDIO_*`, Stripe `pk_*` keys,
Statsig `client-*` keys.

Never `NEXT_PUBLIC_`: `SANITY_API_TOKEN`, `SANITY_API_READ_TOKEN`, `STATSIG_SERVER_SECRET`,
`RESEND_API_KEY`, or any `sk_*` / `sk-*` / `secret-*` / `whsec_*` value.

## If a credential reaches a tracked file

Deleting it is not enough — it survives in git history. Rotate the credential at the
vendor, then remove it. Treat "it was only committed for a minute" as leaked.

## Enforcement

`.claude/hooks/secret-guard.mjs` blocks these cases on `Write`, `Edit` and `Bash`. It is
a speed bump on one path, not a boundary: it cannot see through `$(…)`, heredocs,
`base64 -d`, or a script invoked by path. It does not replace reviewing your own diff.

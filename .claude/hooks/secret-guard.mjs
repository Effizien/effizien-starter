#!/usr/bin/env node
/**
 * PreToolUse secret guard.
 *
 * The question this hook asks is NOT "is this a secret?" — a scanner asks that,
 * and it produces false positives that get the hook deleted within a week. This
 * asks "is this secret about to become git-visible?", which is both answerable
 * and actionable.
 *
 *   Writing a real Sanity token to .env.local  → the developer doing their job.
 *   Writing that same token to sanity/client.ts → an incident.
 *
 * Same bytes, opposite verdicts. The discriminator is `git check-ignore`, which
 * is index-aware: it reports NOT-ignored for a file that matches .gitignore but
 * is already tracked. That case — "I added it to .gitignore afterwards" — is the
 * dangerous one a filename allowlist silently misses.
 *
 * CONTRACT (verified against code.claude.com/docs/en/hooks)
 *   - stdin: JSON with tool_name, tool_input, cwd
 *   - exit 0 + JSON on stdout → decision is honoured
 *   - exit 2 → blocks, but discards stdout, so we lose the structured reason
 *   - ANY OTHER EXIT CODE IS NON-BLOCKING and the write proceeds
 *
 * That last line is why this file try/catches everything and always exits 0:
 * an uncaught throw exits 1, which Claude Code treats as a non-blocking error
 * and lets the write through. On internal failure we return "ask" — a broken
 * guard must not brick the session, but it must not silently wave writes past
 * either.
 */

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  BASH_INTENT_RULES,
  BENIGN_VALUE_SHAPES,
  DOC_PATHS,
  GENERIC_ASSIGNMENT,
  GENERIC_SUPPRESS_PREFIXES,
  PATTERNS,
  PLACEHOLDER_VALUES,
  PUBLIC_IDENTIFIERS,
  SKIP_PATHS,
  TIER,
} from './patterns.mjs'

const HOOK_EVENT = 'PreToolUse'

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

/** Emit a decision and exit. `permissionDecision` must be allow|deny|ask|defer. */
function respond(decision, reason) {
  if (decision === 'allow') {
    // Silent pass. Emitting an explicit "allow" would skip the user's own
    // permission rules; staying quiet leaves normal permissions in charge.
    process.exit(0)
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        // Must equal the firing event exactly, or the parser throws.
        hookEventName: HOOK_EVENT,
        permissionDecision: decision,
        permissionDecisionReason: reason,
      },
    }),
  )
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readStdin() {
  try {
    // fd 0, synchronous — hooks receive their payload and close.
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

/** Shannon entropy in bits per character. */
function entropy(str) {
  if (!str) return 0
  const freq = new Map()
  for (const ch of str) freq.set(ch, (freq.get(ch) || 0) + 1)
  let h = 0
  for (const n of freq.values()) {
    const p = n / str.length
    h -= p * Math.log2(p)
  }
  return h
}

/** Sanity's stega encoding injects zero-width characters that skew entropy. */
function normalize(str) {
  return str.replace(/[\u200B-\u200F\u2060\uFEFF]/g, '')
}

function matchesAny(list, value) {
  return list.some((re) => re.test(value))
}

/**
 * Is `absPath` genuinely excluded from git?
 *
 *   exit 0   → ignored and untracked  → contained
 *   exit 1   → not ignored, OR ignored-but-already-tracked → git-visible
 *   exit 128 → not a git repository   → unknown, fall back to a prompt
 */
function gitContainment(cwd, absPath) {
  try {
    const r = spawnSync('git', ['check-ignore', '-q', '--', absPath], {
      cwd,
      timeout: 5000,
    })
    if (r.error || r.status === null) return 'unknown'
    if (r.status === 0) return 'ignored'
    if (r.status === 128) return 'unknown'
    return 'visible'
  } catch {
    return 'unknown'
  }
}

/** Distinguish "never ignored" from "ignored but already tracked" for remediation. */
function isTracked(cwd, absPath) {
  try {
    const r = spawnSync('git', ['ls-files', '--error-unmatch', '--', absPath], {
      cwd,
      timeout: 5000,
      stdio: 'ignore',
    })
    return r.status === 0
  } catch {
    return false
  }
}

function classifyPath(relPath) {
  const p = relPath.replace(/\\/g, '/') // Windows arrives with backslashes
  return {
    rel: p,
    skip: matchesAny(SKIP_PATHS, p),
    isDoc: matchesAny(DOC_PATHS, p),
    isEnv: /(?:^|\/)\.env(?:$|[.\w-])/.test(p),
    isEnvExample: /(?:^|\/)\.env[.\w-]*\.(?:example|template|sample)$/.test(p),
  }
}

/** The identifier a matched value was assigned to, if any, e.g. FOO_TOKEN="…". */
function identifierFor(text, index) {
  const before = text.slice(Math.max(0, index - 120), index)
  const m = before.match(/([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|:|=>|:=)\s*["'`]?\s*$/)
  return m ? m[1] : null
}

// ---------------------------------------------------------------------------
// Scanning
// ---------------------------------------------------------------------------

function scanContent(rawText, cls, { bash = false } = {}) {
  const text = normalize(rawText)
  const findings = []

  for (const rule of PATTERNS) {
    if (!rule.re) continue
    if (bash && !rule.scanBash) continue

    // matchAll rather than an exec loop: it needs no manual lastIndex reset,
    // which is the classic way a /g regex silently skips matches.
    for (const m of text.matchAll(rule.re)) {
      const value = m[1] ?? m[0]
      if (matchesAny(PLACEHOLDER_VALUES, value)) continue
      if (rule.minEntropy && entropy(value) < rule.minEntropy) continue

      const id = identifierFor(text, m.index)
      if (id && matchesAny(PUBLIC_IDENTIFIERS, id)) continue

      let tier = rule.tier

      // Documentation showing a token FORMAT is a real and legitimate need.
      if (cls.isDoc && !rule.ignoreDocPaths && tier === TIER.BLOCK) tier = TIER.ASK

      // A referrer-restricted Maps key under NEXT_PUBLIC_ is a legitimate pattern.
      if (rule.askWhenPublicPrefixed && id && /^NEXT_PUBLIC_/.test(id)) tier = TIER.ASK

      // The inversion: for every OTHER structural token, NEXT_PUBLIC_ makes it
      // worse, not better. Next.js inlines that value into the browser bundle at
      // build time, so the secret ships to every visitor and cannot be revoked
      // by redeploying.
      if (!rule.askWhenPublicPrefixed && id && /^NEXT_PUBLIC_/.test(id)) {
        tier = TIER.BLOCK
        findings.push({
          rule: rule.id,
          label: `${rule.label} assigned to a NEXT_PUBLIC_ variable`,
          tier,
          detail:
            `${id} is inlined into the client bundle at build time. This credential ` +
            `would ship to every visitor and cannot be revoked by redeploying.`,
        })
        continue
      }

      findings.push({ rule: rule.id, label: rule.label, tier })
    }
  }

  if (!bash && !cls.isEnvExample) findings.push(...scanGeneric(text, cls))
  return findings
}

/** The catch-all. ASK tier only — it is irreducibly heuristic. */
function scanGeneric(text, cls) {
  if (cls.isDoc) return []
  const out = []
  for (const m of text.matchAll(GENERIC_ASSIGNMENT)) {
    const { id, val } = m.groups
    if (GENERIC_SUPPRESS_PREFIXES.test(id)) continue
    if (matchesAny(PUBLIC_IDENTIFIERS, id)) continue
    if (matchesAny(PLACEHOLDER_VALUES, val)) continue
    if (matchesAny(BENIGN_VALUE_SHAPES, val)) continue
    if (/\s/.test(val)) continue // Tailwind class strings, prose
    if (entropy(val) < 3.6) continue
    out.push({
      rule: 'generic-assignment',
      label: `high-entropy value assigned to ${id}`,
      tier: TIER.ASK,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

function decideFileWrite(filePath, content, cwd) {
  const abs = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath)
  const cls = classifyPath(path.relative(cwd, abs) || path.basename(abs))
  if (cls.skip) respond('allow')

  const containment = gitContainment(cwd, abs)

  // Env files are governed by containment, not by content. `sanity init` and
  // `vercel env pull` legitimately write real credentials into .env.local, and
  // blocking that trains the developer to disable the hook.
  if (cls.isEnv && !cls.isEnvExample) {
    if (containment === 'ignored') respond('allow')
    if (containment === 'unknown') {
      return respond(
        'ask',
        `Cannot verify that ${cls.rel} is excluded from git (no repository detected). ` +
          `Confirm only if you are certain this file will never be committed.`,
      )
    }
    const tracked = isTracked(cwd, abs)
    return respond(
      'deny',
      tracked
        ? `${cls.rel} is TRACKED by git. .gitignore does not apply to files already in the index, ` +
            `so this write would be committed. Run: git rm --cached ${cls.rel} — and if this file ` +
            `ever held a real credential, rotate it, because it is already in the history.`
        : `${cls.rel} is not covered by .gitignore, so this write is one 'git add -A' away from ` +
            `being committed. Add '.env*' to .gitignore (keeping '!.env.example'), then retry.`,
    )
  }

  const findings = scanContent(String(content ?? ''), cls)
  if (findings.length === 0) respond('allow')

  // A secret written into a gitignored file is contained by definition.
  if (containment === 'ignored') respond('allow')

  const blocking = findings.filter((f) => f.tier === TIER.BLOCK)
  const list = (fs) =>
    [
      ...new Set(fs.map((f) => `  • ${f.label}${f.detail ? `\n    ${f.detail}` : ''}`)),
    ].join('\n')

  if (blocking.length > 0) {
    return respond(
      'deny',
      `Blocked: credential detected in a git-visible file (${cls.rel}).\n\n${list(blocking)}\n\n` +
        `Move the value to .env.local (gitignored) and reference it via process.env. ` +
        `If this is a documentation example, use an obviously fake value containing 'EXAMPLE'.`,
    )
  }

  return respond(
    'ask',
    `Possible credential in a git-visible file (${cls.rel}). These patterns are ambiguous, ` +
      `so this needs a human:\n\n${list(findings)}`,
  )
}

function decideBash(command, cwd) {
  for (const rule of BASH_INTENT_RULES) {
    if (!rule.re.test(command)) continue
    const verdict = rule.tier === TIER.BLOCK ? 'deny' : 'ask'
    return respond(verdict, `Blocked: ${rule.label}.\n\n${rule.advice}`)
  }

  // A literal credential in argv is world-readable via `ps`, lands in shell
  // history, and is captured in the transcript — even if it never reaches git.
  const cls = classifyPath('<bash-command>')
  const findings = scanContent(command, cls, { bash: true }).filter(
    (f) => f.tier === TIER.BLOCK,
  )
  if (findings.length === 0) respond('allow')

  // Exception: piping a secret into a verified-gitignored env file is the
  // documented way to set one up.
  const redirect = command.match(/>>?\s*([^\s;&|]+)/)
  if (redirect) {
    const abs = path.resolve(cwd, redirect[1])
    if (gitContainment(cwd, abs) === 'ignored') respond('allow')
  }

  const labels = [...new Set(findings.map((f) => `  • ${f.label}`))].join('\n')
  return respond(
    'deny',
    `Blocked: a credential appears literally in this command.\n\n${labels}\n\n` +
      `Command arguments are visible to other processes via 'ps', are written to shell ` +
      `history, and are recorded in this transcript. Use an interactive prompt or a ` +
      `stdin flag instead — for example 'vercel env add NAME' rather than passing the value inline.`,
  )
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

try {
  const raw = readStdin()
  if (!raw.trim()) respond('allow')

  const payload = JSON.parse(raw)
  const tool = payload.tool_name
  const input = payload.tool_input || {}
  const cwd = payload.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd()

  switch (tool) {
    case 'Write':
      decideFileWrite(input.file_path, input.content, cwd)
      break
    case 'Edit':
      // Only the incoming text can introduce a secret; old_string is already there.
      decideFileWrite(input.file_path, input.new_string, cwd)
      break
    case 'NotebookEdit':
      decideFileWrite(input.notebook_path, input.new_source, cwd)
      break
    case 'Bash':
    case 'PowerShell':
      decideBash(String(input.command ?? ''), cwd)
      break
    default:
      respond('allow')
  }
  respond('allow')
} catch (err) {
  // Never exit non-zero: 1 is a NON-BLOCKING error and the write would proceed.
  respond(
    'ask',
    `The secret-scanning hook failed to run (${err?.message ?? 'unknown error'}). ` +
      `It could not check this operation, so it is asking rather than assuming it is safe. ` +
      `Fix .claude/hooks/secret-guard.mjs before continuing.`,
  )
}

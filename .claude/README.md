# `.claude/` — agent configuration

Travels with every site cloned from this starter.

```
.claude/
├── settings.json          committed. Permissions + hook wiring.
├── settings.local.json    NEVER committed. Per-machine overrides. Gitignored.
├── rules/                 conventions loaded into agent context
└── hooks/
    ├── secret-guard.mjs   PreToolUse guard
    └── patterns.mjs       the detection ruleset, as reviewable data
```

## ⚠️ Hooks do not run until you trust the workspace

This is the one thing that will silently defeat the guard.

Claude Code skips **all** hook execution — project hooks and your own user hooks alike —
until the workspace trust dialog has been accepted for this directory. On a fresh clone
the secret guard is inert, and the only trace is a line in the debug log. Nothing appears
in the transcript.

After cloning:

```bash
claude
```

Accept the trust prompt, then confirm the hook is registered:

```bash
claude --debug -p "say ok" 2>&1 | grep -i "hook"
```

Trust is inherited from ancestor directories, so a clone into an already-trusted parent
is live immediately. Non-interactive runs (`claude -p`, CI) bypass the trust check
entirely and hooks run there regardless.

## What the guard actually enforces

It does not ask "is this a secret?" — it asks **"is this secret about to become
git-visible?"** Those have different answers, and only the second is actionable:

| | gitignored destination | git-tracked destination |
|---|---|---|
| High-confidence credential | allowed silently | **denied** |
| Ambiguous match | allowed silently | **asks you** |

The discriminator is `git check-ignore`, which is index-aware. A file that matches
`.gitignore` **but is already tracked** is reported as *not* ignored — which is correct,
because `.gitignore` has no effect on tracked files. That case ("I added it to
`.gitignore` afterwards") is the dangerous one a filename allowlist misses, and the guard
tells you to `git rm --cached` it *and rotate the credential*, because it is already in
the history.

Writing a real token to `.env.local` is allowed. `npx sanity init` and `vercel env pull`
both do exactly that, and a guard that blocks them gets disabled within a week.

## Verifying it

```bash
node .claude/hooks/secret-guard.mjs <<'EOF'
{"hook_event_name":"PreToolUse","tool_name":"Write","cwd":".","tool_input":{"file_path":"src/x.ts","content":"const k = \"sk_live_0123456789abcdefghijklmn\""}}
EOF
```

Expect JSON with `"permissionDecision": "deny"`. No output at all means "allowed".

## Known limits — read before relying on it

- **It is a speed bump, not a boundary.** Bash scanning cannot see through `$(…)`,
  heredocs, `base64 -d |`, `printf`, variable indirection, or a script invoked by path.
- **Only `Write`, `Edit`, `NotebookEdit`, `Bash` and `PowerShell` are covered.** Files
  pulled in with `@path` references never fire a `PreToolUse` hook. An MCP filesystem
  server would bypass it entirely.
- **Rules are context, not enforcement.** Files in `rules/` inform the agent; they do not
  constrain it. Only the hook and the `permissions` block in `settings.json` deny anything.
- **Anyone can switch it off** with `disableAllHooks` in their own user settings.
- **Four of the highest-value credentials in this stack — Sanity, Vercel, Resend and
  Statsig — have no rule in gitleaks' default ruleset.** "We run gitleaks in CI" does not
  cover this repo. That gap is why `patterns.mjs` exists.

Pair it with `gitleaks protect --staged` in a pre-commit hook (which sees the real index,
not just this agent's writes) and GitHub push protection. Defence in depth; no single
layer here is sufficient.

## Token formats: verified vs. inferred

Every rule in `patterns.mjs` carries a `verified` flag recording whether the token
**format** was confirmed against the vendor's own documentation. Several were not —
Anthropic, OpenAI, Resend, Statsig and AWS publish no key grammar, so those patterns are
derived from scanner rulesets and observed samples. They are good signal, not proof.
Do not tighten a `verified: false` pattern without a primary source; the likely result is
a rule that silently stops matching.

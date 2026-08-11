# Prompts

Reusable prompts, versioned with the code so they evolve alongside the site rather than
drifting in someone's notes app.

These are **site-level** prompts. Cross-project prompt masters live in the operator's
Obsidian vault; when one here proves itself across several sites, promote it there.

| File | Use |
|---|---|
| `session-start.md` | Opening a work session on this site |
| `handoff-note.md` | Closing one |

## Conventions

- One prompt per file, kebab-case, with a short note at the top saying when to use it.
- Edit in place and note significant changes — the git history is the version log.
- Prompts that only ever get used once belong in the conversation, not in here.

## Why these two exist

They bracket a session, and both failure modes they prevent are expensive. A session that
starts without context produces confident work against stale assumptions. A session that
ends without a handoff note loses everything that was learned but not written down —
which is usually the reasoning, not the code.

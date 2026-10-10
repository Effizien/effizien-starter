# Prompts

Reusable prompts, versioned with the code, so they change alongside the site instead of drifting in
someone's notes.

These are **site-level** prompts. A prompt that proves itself across several sites is promoted to
`effizien-system`, the playbook of the Effizien system.

| File | Use |
|---|---|
| `session-start.md` | Opening a work session on this site |
| `handoff-note.md` | Closing one |

## Conventions

- One prompt per file, kebab-case, with a short note at the top saying when to use it.
- Edit in place: the git history is the version log.
- A prompt used only once belongs in the conversation, not here.

## Why these two exist

They bracket a session, and the failure each one prevents is expensive. A session that starts
without context produces confident work against stale assumptions. A session that ends without a
handoff note loses everything that was learned but not written down, which is usually the
reasoning, not the code.

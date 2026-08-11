# Session start

Paste at the beginning of a work session on this site. Replace the bracketed part.

---

We're working on **[CLIENT NAME]**, a site built from the Effizien starter.

Read `AGENTS.md` before proposing anything, plus `docs/content-model.md` if the task
touches content, and any ADR in `docs/decisions/` relevant to what we're changing.

Then, before writing code, tell me:

1. Which part of the site we're changing, and what "done" looks like.
2. Anything in the task that conflicts with a hard constraint in `AGENTS.md` — the
   accessibility target, the SEO requirements, the secret-handling rules, or a decision
   recorded in `docs/decisions/`.
3. The ripple effects. Nothing here is decided in isolation: a schema change touches the
   Studio, the queries, the generated types, and every page that renders the field.

Today's task: **[TASK]**

---

## Why it's shaped this way

Making the agent state the scope back before building is the cheapest possible check that
it read the context rather than pattern-matching on the task description. If it cannot
name a constraint that applies, it skimmed.

Asking for ripple effects up front catches the schema-change-breaks-three-pages class of
problem while it is still a conversation.

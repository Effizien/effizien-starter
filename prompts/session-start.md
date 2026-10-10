# Session start

Paste at the beginning of a work session on this site. Replace the bracketed parts.

---

We're working on **[CLIENT NAME]**, a site deployed from the Effizien starter.

Read `AGENTS.md` before proposing anything, plus `docs/content-model.md` if the task touches
content, and any ADR in `docs/decisions/` that bears on the change. If the task touches a system
decision or the discovery behind this site, also read `../effizien-system/AGENTS.md` (add the
directory with `--add-dir ../effizien-system`) and the client's research report in
[WORKING FOLDER].

Then, before writing code, tell me:

1. Which part of the site we're changing, and what "done" looks like.
2. Anything in the task that conflicts with a hard constraint in `AGENTS.md` (the accessibility
   target, the SEO requirements, the secret-handling rules) or with a decision recorded in
   `docs/decisions/`.
3. The ripple effects. Nothing here is decided in isolation: a schema change touches the Studio,
   the queries, the generated types, and every page that renders the field.

Today's task: **[TASK]**

---

## Why it's shaped this way

Making the agent state the scope back before building is the cheapest check that it read the
context rather than pattern-matching on the task description. If it cannot name a constraint that
applies, it skimmed.

Asking for the ripple effects up front catches the kind of schema change that breaks three pages
while it is still a conversation.

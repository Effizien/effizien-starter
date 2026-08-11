# Handoff note

Paste at the end of a work session, before context is lost.

---

Write the handoff note for this session:

```markdown
## Handoff — [what this session covered]
Date · Status: Complete | Partial | Blocked

### What changed
- [artifact + where it lives]

### Decisions made
- [decision + one-line rationale] → needs an ADR in `docs/decisions/`?

### Open questions
- [anything unresolved, and what it blocks]

### What the next session needs to know
- [context that is NOT obvious from reading the diff]

### Next
- [the next piece of work, and what it now depends on]
```

Then tell me whether anything in this session means `HANDOFF.md`, `AGENTS.md`, or
`docs/content-model.md` is now out of date.

---

## Why it's shaped this way

"What the next session needs to know" is the section that earns this prompt. The diff
already records what changed; what it cannot record is why an approach was abandoned,
which constraint forced an awkward shape, or what was tried and did not work. That
reasoning is what gets lost between sessions and re-derived expensively.

The closing question exists because stale context is worse than missing context — people
trust it. If you find yourself explaining the same thing to an agent twice, it belongs in
a context file. Write it down the second time, not the fifth.

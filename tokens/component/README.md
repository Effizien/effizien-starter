# Tier 3 — component tokens

Deliberately empty.

A component token binds one component's property to a semantic token, for example
`button.height.sm` or `card.padding`. It earns its place only when a component needs a
value the semantic tier cannot express — otherwise it is an alias that adds a hop without
adding meaning, and every hop is somewhere the chain can break.

shadcn's components read semantic tokens (`--primary`, `--border`) and derive their
radii from `--radius` directly, so at present none are needed.

**Add one when:** a client's design gives a component a dimension that is genuinely its
own and is reused across instances. **Not when:** you want to name a one-off value — that
belongs in the component's own class list.

Files here are picked up automatically by `tokens/build.mjs`; no config change needed.

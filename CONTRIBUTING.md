# Contributing

## Local development

```bash
bun install
bun run check
```

## Branching

Use short-lived branches and open draft PRs early.

## Commit style

Use scoped prefixes:

- `feat:`
- `fix:`
- `chore:`
- `docs:`

## Testing expectations

Before PR:

```bash
bun run typecheck
bun test
bun run build
```

## Safety rules

- Keep automation changes backward compatible.
- Prefer dry-run support for new commands.
- Avoid destructive Git commands in scripts unless explicit opt-in flag exists.

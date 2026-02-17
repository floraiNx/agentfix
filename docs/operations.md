# Operations

## Safety defaults

- Auto-fix requires explicit label by default (`auto-fix`).
- Max remediation attempts default to `2`.
- Bug-hunt scripts only cherry-pick unique commits unless overridden.

## Recommended checks

Before shipping changes from automation:

```bash
bun run check
```

And run repo-specific gates from `.agentfix.yml`:

- `modes.autoFix.gateCommand`
- `modes.bugHunt.gateCommand`

## Incident handling

If a provider dispatch fails:

1. Check secret/env token
2. Check provider URL reachability
3. Retry with `--dry-run` first to inspect payload
4. Fallback to manual patch PR

If GitHub App webhook calls fail:

1. Verify `GITHUB_WEBHOOK_SECRET` matches your GitHub App webhook config
2. Check `GET /app/meta` for missing app envs
3. Ensure app is installed on target repo and payload contains `installation.id`

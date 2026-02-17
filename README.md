# AgentFix

AgentFix is a repo-agnostic GitHub automation toolkit for:

- `auto-fix` mode: review/Sentry-triggered remediation with OpenClaw/Codex/Claude adapters
- `bug-hunt` mode: multi-agent parallel sweeps with scoped worktrees and merge polling

Built from real production orchestration patterns used in Shoppex, but packaged so any repo can use it.

## Why this is useful

Most teams can wire one workflow, but few teams can run a safe loop end-to-end:

1. detect problem
2. dispatch to an agent provider
3. open reviewable PRs
4. enforce test gates
5. avoid duplicate/looping fixes

AgentFix ships that as reusable building blocks.

## Quick start

```bash
bun install
bun run typecheck
bun run test
bun run build

# Generate starter config and workflow templates
bun src/cli.ts init

# Dry-run auto-fix with an event payload
bun src/cli.ts run autofix --event-file examples/sample-autofix-event.json --dry-run

# Dry-run bug-hunt orchestration plan
bun src/cli.ts run bughunt --dry-run
```

## Core commands

- `agentfix init`
- `agentfix serve --port 8787`
- `agentfix run autofix --event-file <file> [--dry-run]`
- `agentfix run bughunt [--session-root <path>] [--dry-run]`

## Repo setup contract

Add `.agentfix.yml`:

```yaml
version: 1
providers:
  openclaw:
    baseUrl: https://your-openclaw-host
    tokenEnv: OPENCLAW_TOKEN
    model: openai-codex/gpt-5.3-codex
modes:
  autoFix:
    enabled: true
    maxAttempts: 2
    requireLabel: auto-fix
  bugHunt:
    enabled: true
    profile: focused
    baseBranch: dev
```

## Documentation

- `docs/quickstart.md`
- `docs/architecture.md`
- `docs/operations.md`

## Status

`v0.1.0` bootstraps the standalone platform:

- configuration schema and validation
- OpenClaw dispatch client
- auto-fix planner + prompt builder
- bug-hunt planner + shell orchestration scripts
- webhook server entrypoint
- workflow template generators
- tests for schema, dedupe, and template outputs

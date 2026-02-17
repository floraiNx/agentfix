# Provenance (What was ported)

This repository is intentionally based on battle-tested orchestration patterns from Shoppex.

## Imported design patterns

1. Multi-agent bug-hunt orchestration
- worktree setup with profile-based agent sets
- autonomous worker loops
- merge polling with duplicate guards

2. Auto-fix dispatch orchestration
- provider-first dispatch model (OpenClaw as primary adapter)
- explicit retry/attempt limits
- dry-run mode for safe validation

3. Sentry triage automation
- unresolved-issue harvesting
- latest-event stack trace enrichment
- queueing data model for follow-up dispatch

## Shoppex reference commits

- `0d6f5512` – multi-agent bug-hunt playbook
- `8dba48f2` – autonomous merge poller
- `375c129c` – autonomous runner + supervisor
- `58630615` – full-profile overnight bug-hunt coverage
- `999ee2a5` – insights/refactor signal reporting
- `bf31764b` – Greptile + Sentry auto-remediation pipelines
- `afa4870b` – OpenClaw as primary dispatch path
- `4e369057` – dispatch protocol migration to `/v1/chat/completions`
- `7707b5d3` – dispatch hardening + retry policy
- `14f3d291` – Sentry OpenClaw model pinning
- `5083b5dd` – Codex 5.3 auto-remediation upgrade

## What changed in AgentFix

- generalized naming and repo assumptions
- English-only docs and prompts
- reusable `.agentfix.yml` contract
- standalone CLI and webhook service

# Architecture

## High-level modules

1. `src/config/*`
- Loads and validates `.agentfix.yml`

2. `src/providers/*`
- Provider adapters (OpenClaw first)

3. `src/modes/auto-fix.ts`
- Converts findings/events into structured remediation prompt + dispatch

4. `src/modes/bug-hunt.ts`
- Creates campaign plan and can call autonomous shell orchestrator

5. `scripts/bughunt/*`
- Worktree bootstrap, agent loops, poll/merge integration

6. `src/server/app.ts`
- Webhook server for GitHub events

## Data flow: auto-fix

GitHub review/Sentry issue -> AgentFix server/CLI -> AutoFix planner -> provider dispatch -> status result.

## Data flow: bug-hunt

Operator starts campaign -> setup worktrees -> workers run in parallel -> poller cherry-picks gated commits -> summary artifacts.

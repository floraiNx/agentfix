# AgentFix

AgentFix is a repo-agnostic automation platform for AI-assisted remediation and multi-agent bug-hunt campaigns.

It gives teams a reusable control plane for:

- review-driven auto-fix dispatch
- Sentry-style error triage into fix workflows
- parallel bug-hunt orchestration with branch-safe merge polling

## What you get

- **GitHub App runtime** with webhook signature verification
- **OpenClaw-first dispatch adapter** (`/v1/chat/completions` compatible)
- **Auto-fix prompt planner** with finding deduplication
- **Bug-hunt campaign orchestration** (worktrees, workers, poller)
- **Config contract** via `.agentfix.yml`
- **Scaffold tooling** for workflows and GitHub App manifest
- **Tests + docs** ready for external adoption
- **CI workflow** to enforce typecheck, tests, and build

## Quick Start

```bash
bun install
bun run check
bun run build
bun run env:check

# Create starter files
bun src/cli.ts init

# Dry-run auto-fix planner
bun src/cli.ts run autofix --event-file examples/sample-autofix-event.json --dry-run

# Dry-run bug-hunt command planning
bun src/cli.ts run bughunt --dry-run
```

## CLI

```bash
agentfix init
agentfix scaffold github-app-manifest \
  --app-url https://agentfix.example.com \
  --webhook-url https://agentfix.example.com/webhooks/github \
  --callback-url https://agentfix.example.com/auth/callback
agentfix serve --port 8787
agentfix run autofix --event-file examples/sample-autofix-event.json --dry-run
agentfix run bughunt --session-root /tmp/agentfix-bughunt --dry-run
```

## GitHub App Setup (fast path)

1. Create a GitHub App and configure webhook URL: `https://<host>/webhooks/github`
2. Configure required permissions:
- `Pull requests: Read`
- `Contents: Read`
- `Issues: Write`
- `Metadata: Read`
3. Install app on a test repo
4. Set env vars from `.env.example`
5. Run server:

```bash
bun src/cli.ts serve --port 8787
```

Health checks:

- `GET /health`
- `GET /app/meta`

Manifest helpers:

- `examples/github-app-manifest.example.json`
- `agentfix scaffold github-app-manifest ...`

## Deploy

Production deployment options are ready in-repo:

- Docker: `Dockerfile`, `docker-compose.yml`
- Render: `render.yaml`
- Railway: `railway.json`
- Fly.io: `fly.toml`

See: `docs/deploy.md`

## End-to-End Demo

Generate a real demo target repo + PR automatically:

```bash
bash scripts/demo/create-demo-repo.sh --name agentfix-demo-target --visibility private
```

Then submit a PR review with `changes_requested` to trigger AgentFix.

See: `docs/e2e-demo.md`

## Repository Contract

`.agentfix.yml` controls provider and mode behavior.

```yaml
version: 1
providers:
  openclaw:
    baseUrl: https://openclaw.example.com
    tokenEnv: OPENCLAW_TOKEN
    model: openai-codex/gpt-5.3-codex
githubApp:
  enabled: true
  appIdEnv: GITHUB_APP_ID
  privateKeyEnv: GITHUB_APP_PRIVATE_KEY
  webhookSecretEnv: GITHUB_WEBHOOK_SECRET
  apiBaseUrl: https://api.github.com
  reviewAuthors: ["greptile", "greptile[bot]"]
modes:
  autoFix:
    enabled: true
    requireLabel: auto-fix
    maxAttempts: 2
    gateCommand: bun run test
  bugHunt:
    enabled: true
    baseBranch: dev
    profile: focused
    gateCommand: bun run test
    commitPrefixes: [fix, chore]
```

## Docs

- `docs/README.md`
- `docs/quickstart.md`
- `docs/github-app-setup.md`
- `docs/deploy.md`
- `docs/e2e-demo.md`
- `docs/architecture.md`
- `docs/operations.md`
- `docs/provenance.md`

## Development

```bash
bun run typecheck
bun test
bun run build
```

## Security Notes

- Webhooks are verified with `x-hub-signature-256`
- GitHub App tokens are short-lived installation tokens
- Private keys are loaded from environment only
- Auto-fix mode can be gated by label and max-attempts policy

## License

MIT

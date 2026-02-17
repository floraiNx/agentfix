# Quickstart

## 1) Install

```bash
bun install
```

## 2) Initialize repo files

```bash
bun src/cli.ts init
bun src/cli.ts scaffold github-app-manifest \
  --app-url https://agentfix.example.com \
  --webhook-url https://agentfix.example.com/webhooks/github \
  --callback-url https://agentfix.example.com/auth/callback
```

This creates:

- `.agentfix.yml`
- `.github/workflows/agentfix-pr-remediation.yml`
- `.github/workflows/agentfix-sentry-gap.yml`
- `.agentfix/github-app-manifest.json`

## 3) Configure secrets

Required for OpenClaw dispatch:

- `OPENCLAW_TOKEN`
- Use `providers.openclaw.baseUrl` in `.agentfix.yml`

Required for GitHub App runtime:

- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

Optional provider keys:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

## 4) Run locally

```bash
bun run env:check
bun src/cli.ts run autofix --event-file examples/sample-autofix-event.json --dry-run
bun src/cli.ts run bughunt --dry-run
```

## 5) Run webhook service

```bash
bun src/cli.ts serve --port 8787
```

The server accepts GitHub-style webhooks at `POST /webhooks/github`.

## 6) GitHub App setup

Create a GitHub App and configure:

- Webhook URL: `https://<your-host>/webhooks/github`
- Webhook secret: same value as `GITHUB_WEBHOOK_SECRET`
- Permissions:
  - Pull requests: Read
  - Contents: Read
  - Issues: Write

Install the app on a repository and trigger a `pull_request_review` event with `changes_requested`.

## 7) Optional: create a live demo repo

```bash
bash scripts/demo/create-demo-repo.sh --name agentfix-demo-target --visibility private
bash scripts/demo/enable-auto-request-changes.sh --repo <owner/agentfix-demo-target> --pr 1
```

## 8) Run Sentry loop locally (optional)

```bash
SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECTS=backend bun run sentry:fetch
GITHUB_TOKEN=... GITHUB_REPOSITORY=<owner/repo> bun run sentry:sync-issues
GITHUB_REPOSITORY=<owner/repo> bun run sentry:build-contexts
OPENCLAW_TOKEN=... AGENTFIX_OPENCLAW_BASE_URL=https://your-openclaw-host GITHUB_TOKEN=... GITHUB_REPOSITORY=<owner/repo> bun run sentry:dispatch-contexts
```

For full details see:

- `docs/github-app-setup.md`
- `docs/deploy.md`
- `docs/e2e-demo.md`

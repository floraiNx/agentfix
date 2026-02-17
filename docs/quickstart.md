# Quickstart

## 1) Install

```bash
bun install
```

## 2) Initialize repo files

```bash
bun src/cli.ts init
```

This creates:

- `.agentfix.yml`
- `.github/workflows/agentfix-pr-remediation.yml`
- `.github/workflows/agentfix-sentry-gap.yml`

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

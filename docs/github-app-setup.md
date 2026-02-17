# GitHub App Setup

This guide configures AgentFix as a GitHub App backend.

## 1) Generate manifest template

```bash
bun src/cli.ts scaffold github-app-manifest \
  --app-url https://agentfix.example.com \
  --webhook-url https://agentfix.example.com/webhooks/github \
  --callback-url https://agentfix.example.com/auth/callback
```

Output file:

- `.agentfix/github-app-manifest.json`

Reference example:

- `examples/github-app-manifest.example.json`

## 2) Create the GitHub App

In GitHub App settings:

- Webhook URL: `https://<host>/webhooks/github`
- Webhook secret: strong random string

Permissions:

- `Pull requests: Read`
- `Contents: Read`
- `Issues: Write`
- `Metadata: Read`

Events:

- `Pull request review`
- `Ping`

## 3) Install app on repository

Install on a test repository first.

## 4) Configure runtime env vars

- `OPENCLAW_TOKEN`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

`GITHUB_APP_PRIVATE_KEY` supports escaped `\n` sequences.

## 5) Start AgentFix

```bash
bun run env:check
bun src/cli.ts serve --port 8787
```

## 6) Validate runtime state

- `GET /health`
- `GET /app/meta`

`/app/meta` should show `githubAppEnabled: true` and `envReady: true`.

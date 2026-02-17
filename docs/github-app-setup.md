# GitHub App Setup

This guide sets up AgentFix as a real GitHub App backend.

## 1) Create manifest (recommended)

Use CLI to generate a manifest file:

```bash
bun src/cli.ts scaffold github-app-manifest \
  --app-url https://agentfix.example.com \
  --webhook-url https://agentfix.example.com/webhooks/github \
  --callback-url https://agentfix.example.com/auth/callback
```

Output:

- `.agentfix/github-app-manifest.json`

You can copy this JSON into GitHub App creation flow or use it as your baseline.

## 2) Create GitHub App

In GitHub App settings:

- **Webhook URL**: `https://<host>/webhooks/github`
- **Webhook secret**: choose a strong secret

Permissions:

- `Pull requests: Read`
- `Contents: Read`
- `Issues: Write`
- `Metadata: Read`

Events:

- `Pull request review`

## 3) Install the app

Install the app on one test repository first.

## 4) Configure runtime secrets

Set env vars in your runtime:

- `OPENCLAW_TOKEN`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

`GITHUB_APP_PRIVATE_KEY` can be stored with escaped newlines (`\n`).

## 5) Start service

```bash
bun src/cli.ts serve --port 8787
```

## 6) Verify health

- `GET /health`
- `GET /app/meta`

If `envReady: false`, check your app env names and values.

## 7) Trigger auto-fix flow

Submit a PR review with `changes_requested` from your configured reviewer account (`githubApp.reviewAuthors`).

AgentFix will:

1. verify signature
2. exchange app JWT for installation token
3. fetch review comments
4. extract findings
5. dispatch auto-fix to OpenClaw
6. post status comment on the PR

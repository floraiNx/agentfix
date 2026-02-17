# Deployment Guide

This guide covers practical production deployment options for AgentFix.

## Required env vars

- `OPENCLAW_TOKEN`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

Validate locally:

```bash
bun run env:check
```

## Option A: Docker (self-hosted)

```bash
bun run docker:build
bun run docker:run
```

Or with compose:

```bash
docker compose up --build
```

Files:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`

## Option B: Render

1. Create a new **Web Service** from this repo
2. Render detects `render.yaml`
3. Set required env vars in Render dashboard
4. Deploy

Health endpoint:

- `GET /health`

## Option C: Railway

1. Create project from GitHub repo
2. Railway uses `railway.json`
3. Configure required env vars
4. Deploy

## Option D: Fly.io

1. Install `flyctl`
2. Update app name in `fly.toml`
3. Create app and deploy:

```bash
flyctl apps create <your-agentfix-app>
flyctl secrets set OPENCLAW_TOKEN=... GITHUB_APP_ID=... GITHUB_APP_PRIVATE_KEY='...' GITHUB_WEBHOOK_SECRET=...
flyctl deploy
```

## Post-deploy checklist

1. `GET /health` returns `{ "ok": true }`
2. `GET /app/meta` shows `envReady: true`
3. GitHub App webhook URL points to `https://<host>/webhooks/github`
4. GitHub App is installed on at least one repository

## Recommended hardening

- add reverse-proxy request logging and request IDs
- add rate-limiting for `/webhooks/github`
- add retry/backoff for provider dispatch errors
- add alerts for repeated 401/502 webhook responses

# Deployment Guide

This is a minimal production deployment path.

## Runtime requirements

- Bun runtime
- Public HTTPS endpoint
- Persistent env secrets

## Required environment variables

- `OPENCLAW_TOKEN`
- `GITHUB_APP_ID`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

Optional:

- `PORT` (if your platform injects it, map to `--port`)

## Dockerfile (example)

```dockerfile
FROM oven/bun:1
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile || bun install
EXPOSE 8787
CMD ["bun", "src/cli.ts", "serve", "--port", "8787"]
```

## Deploy checklist

1. Deploy service to your host (Railway/Render/Fly/self-hosted)
2. Set all required env vars
3. Expose HTTPS URL
4. Update GitHub App webhook URL to `https://<host>/webhooks/github`
5. Run a test `pull_request_review` event
6. Confirm status comment appears on PR

## Post-deploy validation

- `GET /health` returns `ok: true`
- `GET /app/meta` returns `envReady: true`
- Auto-fix dispatch response is `ok: true`

## Hardening recommendations

- Add structured request logging and request IDs
- Add rate limiting on `/webhooks/github`
- Add retry/backoff around provider dispatch failures
- Add alerting for repeated `502` responses

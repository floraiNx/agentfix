# End-to-End Demo Runbook

Use this runbook to demonstrate AgentFix in under 15 minutes.

## Goal

Show complete loop:

1. PR receives `changes_requested`
2. AgentFix receives webhook
3. Findings are extracted
4. OpenClaw dispatch is executed
5. PR receives status comment

## Prerequisites

- AgentFix deployed and reachable over HTTPS
- GitHub App installed on demo repo
- `OPENCLAW_TOKEN` configured

## Demo steps

1. Open a test PR in demo repository
2. Add review comments on concrete lines (at least one)
3. Submit review with `Request changes`
4. Observe AgentFix logs
5. Refresh PR and verify status comment from AgentFix

## Success criteria

- webhook accepted (HTTP 200)
- no signature errors
- installation token exchange succeeds
- findings count > 0
- dispatch response `ok: true`

## Demo troubleshooting

- No webhook events:
  - verify app installed on repo
  - verify webhook URL and SSL
- Signature errors:
  - mismatch between app webhook secret and runtime `GITHUB_WEBHOOK_SECRET`
- No findings:
  - reviewer login not in `githubApp.reviewAuthors`
  - no inline review comments on PR
- Dispatch failure:
  - invalid `OPENCLAW_TOKEN`
  - provider URL unreachable or non-compatible

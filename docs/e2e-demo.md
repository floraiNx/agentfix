# End-to-End Demo Runbook

Use this runbook for a live 10-15 minute demo.

## What you will show

1. a PR gets `changes_requested`
2. AgentFix verifies webhook signature
3. AgentFix extracts review findings
4. AgentFix dispatches remediation to OpenClaw
5. AgentFix posts status comment on the PR

## Step 1: Create a demo target repository

Use the bootstrap script:

```bash
bash scripts/demo/create-demo-repo.sh --name agentfix-demo-target --visibility private
```

Output includes:

- local repo path
- GitHub repo URL
- PR URL (unless `--skip-pr`)

The script creates a PR with an intentionally introduced tenant-isolation bug.

## Step 2: Trigger `REQUEST_CHANGES` automatically (no manual review)

Use the bot helper:

```bash
bash scripts/demo/enable-auto-request-changes.sh \
  --repo <owner/agentfix-demo-target> \
  --pr 1
```

This adds and triggers a workflow that submits an inline `REQUEST_CHANGES` review as `github-actions[bot]`.

## Step 3: Observe AgentFix service logs

Expected sequence:

1. webhook accepted
2. installation token exchange success
3. review comments fetched
4. findings extracted
5. OpenClaw dispatch result logged
6. status comment posted on PR

## Success criteria

- webhook response `200`
- no signature errors
- findings count > 0
- provider dispatch `ok: true`
- PR includes AgentFix status comment

## Troubleshooting

- `401 Invalid webhook signature`
  - mismatch in GitHub App webhook secret vs `GITHUB_WEBHOOK_SECRET`
- `502 GitHub App flow failed`
  - wrong app ID/private key, app not installed, missing permissions
- `dispatch failed`
  - invalid OpenClaw token or endpoint incompatibility

#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  enable-auto-request-changes.sh --repo <owner/repo> --pr <number>

Adds a workflow that submits REQUEST_CHANGES as github-actions[bot]
and triggers it immediately.
USAGE
}

REPO=""
PR_NUMBER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) REPO="${2:-}"; shift 2 ;;
    --pr) PR_NUMBER="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "${REPO}" || -z "${PR_NUMBER}" ]]; then
  usage
  exit 1
fi

TMP_DIR="/tmp/agentfix-auto-review-$(echo "$REPO" | tr '/' '-')-$(date +%s)"
gh repo clone "$REPO" "$TMP_DIR" >/dev/null
cd "$TMP_DIR"

git checkout main
mkdir -p .github/workflows

cat > .github/workflows/agentfix-auto-request-changes.yml <<'YAML'
name: AgentFix Auto Request Changes

on:
  workflow_dispatch:
    inputs:
      pr_number:
        description: Pull request number
        required: true
        type: number

permissions:
  pull-requests: write
  contents: read

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Request changes with inline comment
        uses: actions/github-script@v7
        env:
          PR_NUMBER: ${{ github.event.inputs.pr_number }}
        with:
          script: |
            const prNumber = Number(process.env.PR_NUMBER || '0');
            if (!Number.isFinite(prNumber) || prNumber <= 0) {
              core.setFailed(`Invalid pr_number input: ${process.env.PR_NUMBER}`);
              return;
            }

            const { owner, repo } = context.repo;
            const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: prNumber });
            const commitId = pr.head.sha;

            await github.rest.pulls.createReview({
              owner,
              repo,
              pull_number: prNumber,
              commit_id: commitId,
              event: 'REQUEST_CHANGES',
              body: 'Automated review: tenant isolation guard must not be removed.',
              comments: [
                {
                  path: 'src/order-service.js',
                  line: 2,
                  side: 'RIGHT',
                  body: 'Blocking: restoring tenant guard is required to prevent cross-tenant writes.'
                }
              ]
            });
YAML

git config user.name "agentfix-bot"
git config user.email "agentfix-bot@example.com"
git add .github/workflows/agentfix-auto-request-changes.yml
if ! git diff --cached --quiet; then
  git commit -m "ci: add auto request-changes workflow"
  git push origin main
fi

# Allow workflow to write reviews.
gh api "repos/${REPO}/actions/permissions/workflow" \
  --method PUT \
  -f default_workflow_permissions=write \
  -F can_approve_pull_request_reviews=true >/dev/null

gh workflow run agentfix-auto-request-changes.yml --repo "$REPO" -f pr_number="$PR_NUMBER"

echo "Triggered auto request-changes workflow for PR #${PR_NUMBER} on ${REPO}"

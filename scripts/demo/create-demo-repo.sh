#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  create-demo-repo.sh [options]

Options:
  --name <repo-name>         GitHub repo name (default: agentfix-demo-target)
  --owner <github-owner>     GitHub owner/user (default: current gh user)
  --visibility <public|private> (default: private)
  --workdir <path>           Local temp path (default: /tmp/<repo-name>-<timestamp>)
  --skip-remote              Do not create GitHub repo, local only
  --skip-pr                  Do not open PR (remote mode only)
  -h, --help                 Show help
USAGE
}

REPO_NAME="agentfix-demo-target"
OWNER=""
VISIBILITY="private"
WORKDIR=""
SKIP_REMOTE=0
SKIP_PR=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name) REPO_NAME="${2:-agentfix-demo-target}"; shift 2 ;;
    --owner) OWNER="${2:-}"; shift 2 ;;
    --visibility) VISIBILITY="${2:-private}"; shift 2 ;;
    --workdir) WORKDIR="${2:-}"; shift 2 ;;
    --skip-remote) SKIP_REMOTE=1; shift ;;
    --skip-pr) SKIP_PR=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ "${VISIBILITY}" != "private" && "${VISIBILITY}" != "public" ]]; then
  echo "Invalid visibility: ${VISIBILITY}" >&2
  exit 1
fi

if [[ -z "${WORKDIR}" ]]; then
  WORKDIR="/tmp/${REPO_NAME}-$(date +%Y%m%d-%H%M%S)"
fi

if [[ -z "${OWNER}" && ${SKIP_REMOTE} -eq 0 ]]; then
  OWNER="$(gh api user --jq .login)"
fi

mkdir -p "${WORKDIR}"
cd "${WORKDIR}"

git init -b main

cat > package.json <<'JSON'
{
  "name": "agentfix-demo-target",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
JSON

mkdir -p src test

cat > src/order-service.js <<'JS'
export function updateOrderTenantScoped(order, actorTenantId, patch) {
  if (order.tenantId !== actorTenantId) {
    throw new Error("forbidden");
  }

  return {
    ...order,
    ...patch,
    updatedAt: new Date().toISOString()
  };
}
JS

cat > test/order-service.test.js <<'JS'
import test from "node:test";
import assert from "node:assert/strict";
import { updateOrderTenantScoped } from "../src/order-service.js";

test("rejects cross-tenant updates", () => {
  const order = { id: "ord_1", tenantId: "tenant_a", status: "pending" };
  assert.throws(
    () => updateOrderTenantScoped(order, "tenant_b", { status: "paid" }),
    /forbidden/
  );
});

test("allows same-tenant updates", () => {
  const order = { id: "ord_2", tenantId: "tenant_a", status: "pending" };
  const updated = updateOrderTenantScoped(order, "tenant_a", { status: "paid" });
  assert.equal(updated.status, "paid");
});
JS

cat > README.md <<'MD'
# AgentFix Demo Target

This repository is intentionally small and includes a tenant-isolation sensitive code path.

Use it to demo AgentFix review-driven remediation flow.
MD

npm test >/dev/null 2>&1 || true

git add .
git commit -m "feat: add tenant-scoped order update baseline" >/dev/null

git checkout -b feature/remove-tenant-guard >/dev/null
cat > src/order-service.js <<'JS'
export function updateOrderTenantScoped(order, actorTenantId, patch) {
  // Bug introduced intentionally for demo: tenant guard removed.
  return {
    ...order,
    ...patch,
    updatedAt: new Date().toISOString(),
    actorTenantId
  };
}
JS

git add src/order-service.js
git commit -m "refactor: simplify order update path" >/dev/null

if [[ ${SKIP_REMOTE} -eq 1 ]]; then
  echo "Demo repo created locally: ${WORKDIR}"
  echo "Current branch: $(git rev-parse --abbrev-ref HEAD)"
  exit 0
fi

FULL_REPO="${OWNER}/${REPO_NAME}"

gh repo create "${FULL_REPO}" "--${VISIBILITY}" --source . --remote origin --push >/dev/null

git checkout main >/dev/null
git push -u origin main >/dev/null

git checkout feature/remove-tenant-guard >/dev/null
git push -u origin feature/remove-tenant-guard >/dev/null

PR_URL=""
if [[ ${SKIP_PR} -eq 0 ]]; then
  PR_URL="$(gh pr create \
    --repo "${FULL_REPO}" \
    --base main \
    --head feature/remove-tenant-guard \
    --title "refactor: simplify order update path" \
    --body "This PR intentionally removes a tenant guard for AgentFix demo flow. Request changes with inline comments to trigger remediation." \
  )"
fi

echo "Demo repo ready"
echo "Local path: ${WORKDIR}"
echo "GitHub repo: https://github.com/${FULL_REPO}"
if [[ -n "${PR_URL}" ]]; then
  echo "Pull request: ${PR_URL}"
fi

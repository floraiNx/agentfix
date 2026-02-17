#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  setup-agent-worktrees.sh [base-branch] [stamp] [target-root] [profile]

Profiles:
  focused  - 6 agents (default)
  full     - 12 agents (wider overnight coverage)
USAGE
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
BASE_BRANCH="${1:-dev}"
STAMP="${2:-$(date +%Y%m%d-%H%M)}"
TARGET_ROOT="${3:-${REPO_ROOT}/../agentfix-bughunt-${STAMP}}"
PROFILE="${4:-focused}"

case "${PROFILE}" in
  focused)
    AGENTS=(
      "fees-core"
      "catalog-coupons"
      "checkout-sdk"
      "dashboard-editor"
      "backend-platform"
      "themes-worker"
    )
    ;;
  full)
    AGENTS=(
      "fees-core"
      "invoices-lifecycle"
      "catalog-coupons"
      "checkout-sdk"
      "dashboard-editor"
      "dashboard-core"
      "backend-dev-api"
      "backend-auth-security"
      "backend-queues-webhooks"
      "backend-storefront"
      "themes-worker"
      "landing-packages"
    )
    ;;
  *)
    echo "Unknown profile: ${PROFILE}" >&2
    exit 1
    ;;
esac

mkdir -p "${TARGET_ROOT}"

for agent in "${AGENTS[@]}"; do
  path="${TARGET_ROOT}/${agent}"
  branch="agentfix/bughunt-${agent}-${STAMP}"

  if git show-ref --verify --quiet "refs/heads/${branch}"; then
    branch="${branch}-$(date +%s)"
  fi

  git -C "${REPO_ROOT}" worktree add -b "${branch}" "${path}" "${BASE_BRANCH}"
  echo "${agent} ${path} ${branch}"
done

{
  echo "# Auto-generated"
  for agent in "${AGENTS[@]}"; do
    echo "${agent}"
  done
} > "${TARGET_ROOT}/AGENTS.txt"

echo "Session root: ${TARGET_ROOT}"

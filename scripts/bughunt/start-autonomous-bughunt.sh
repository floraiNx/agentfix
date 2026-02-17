#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="dev"
PROFILE="focused"
SESSION_ROOT=""
RUNTIME_DIR=""
MODE="danger"
INTERVAL_SEC=120
MAX_IDLE=3
POLL_INTERVAL_SEC=180
GATE_CMD=""
COMMIT_PREFIXES="fix,chore"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE_BRANCH="${2:-dev}"; shift 2 ;;
    --profile) PROFILE="${2:-focused}"; shift 2 ;;
    --session-root) SESSION_ROOT="${2:-}"; shift 2 ;;
    --runtime-dir) RUNTIME_DIR="${2:-}"; shift 2 ;;
    --mode) MODE="${2:-danger}"; shift 2 ;;
    --interval-sec) INTERVAL_SEC="${2:-120}"; shift 2 ;;
    --max-idle-cycles) MAX_IDLE="${2:-3}"; shift 2 ;;
    --poll-interval-sec) POLL_INTERVAL_SEC="${2:-180}"; shift 2 ;;
    --gate-cmd) GATE_CMD="${2:-}"; shift 2 ;;
    --commit-prefixes) COMMIT_PREFIXES="${2:-fix,chore}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
if [[ -z "${SESSION_ROOT}" ]]; then
  stamp="$(date +%Y%m%d-%H%M%S)"
  SESSION_ROOT="${REPO_ROOT}/../agentfix-bughunt-${stamp}"
  bash "${REPO_ROOT}/scripts/bughunt/setup-agent-worktrees.sh" "${BASE_BRANCH}" "${stamp}" "${SESSION_ROOT}" "${PROFILE}"
fi

if [[ -z "${RUNTIME_DIR}" ]]; then
  RUNTIME_DIR="${REPO_ROOT}/.bughunt-runtime/$(date +%Y%m%d-%H%M%S)"
fi
mkdir -p "${RUNTIME_DIR}/logs" "${RUNTIME_DIR}/status" "${RUNTIME_DIR}/pids"

agents=()
while IFS= read -r line; do
  [[ -z "${line}" || "${line}" =~ ^# ]] && continue
  agents+=("${line}")
done < "${SESSION_ROOT}/AGENTS.txt"

scope_for() {
  case "$1" in
    fees-core) echo "- src/payments\n- src/invoices" ;;
    catalog-coupons) echo "- src/catalog\n- src/coupons" ;;
    checkout-sdk) echo "- apps/checkout\n- packages/sdk" ;;
    dashboard-editor) echo "- apps/dashboard/editor" ;;
    backend-platform) echo "- apps/backend/plugins\n- apps/backend/routes" ;;
    themes-worker) echo "- themes\n- workers" ;;
    *) echo "- src" ;;
  esac
}

skills_for() {
  case "$1" in
    checkout-sdk|dashboard-editor|themes-worker) echo "playwright,codex-review" ;;
    *) echo "fastify-backend-dev,codex-review" ;;
  esac
}

tests_for() {
  echo "bun run test && bun run typecheck"
}

branch_file="${RUNTIME_DIR}/agent-branches.txt"
: > "${branch_file}"

for agent in "${agents[@]}"; do
  worktree="${SESSION_ROOT}/${agent}"
  branch="$(git -C "${worktree}" rev-parse --abbrev-ref HEAD)"
  echo "${branch}" >> "${branch_file}"

  nohup bash "${REPO_ROOT}/scripts/bughunt/agent-loop.sh" \
    --agent "${agent}" \
    --worktree "${worktree}" \
    --branch "${branch}" \
    --runtime-dir "${RUNTIME_DIR}" \
    --scope "$(scope_for "${agent}")" \
    --skills "$(skills_for "${agent}")" \
    --tests "$(tests_for "${agent}")" \
    --interval-sec "${INTERVAL_SEC}" \
    --max-idle-cycles "${MAX_IDLE}" \
    --mode "${MODE}" \
    --commit-prefixes "${COMMIT_PREFIXES}" \
    > "${RUNTIME_DIR}/logs/${agent}.nohup.log" 2>&1 &

  echo "$!" > "${RUNTIME_DIR}/pids/${agent}.pid"
  echo "started agent=${agent} pid=$!"
done

poller_cmd="bash ${REPO_ROOT}/scripts/bughunt/poll-agent-branches.sh --base ${BASE_BRANCH} --config ${branch_file}"
if [[ -n "${GATE_CMD}" ]]; then
  poller_cmd+=" --gate-cmd \"${GATE_CMD}\""
fi

nohup bash -lc "while true; do ${poller_cmd}; sleep ${POLL_INTERVAL_SEC}; done" \
  > "${RUNTIME_DIR}/logs/poller.log" 2>&1 &

echo "$!" > "${RUNTIME_DIR}/pids/poller.pid"

cat <<OUT
Autonomous bug-hunt started.
Session root: ${SESSION_ROOT}
Runtime dir:  ${RUNTIME_DIR}
OUT

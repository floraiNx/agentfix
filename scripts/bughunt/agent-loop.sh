#!/usr/bin/env bash
set -euo pipefail

AGENT=""
WORKTREE=""
BRANCH=""
RUNTIME_DIR=""
SCOPE_TEXT=""
SKILLS=""
TESTS_TEXT=""
INTERVAL_SEC=90
MAX_IDLE=3
MODE="danger"
COMMIT_PREFIXES="fix,chore"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent) AGENT="${2:-}"; shift 2 ;;
    --worktree) WORKTREE="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --runtime-dir) RUNTIME_DIR="${2:-}"; shift 2 ;;
    --scope) SCOPE_TEXT="${2:-}"; shift 2 ;;
    --skills) SKILLS="${2:-}"; shift 2 ;;
    --tests) TESTS_TEXT="${2:-}"; shift 2 ;;
    --interval-sec) INTERVAL_SEC="${2:-90}"; shift 2 ;;
    --max-idle-cycles) MAX_IDLE="${2:-3}"; shift 2 ;;
    --mode) MODE="${2:-danger}"; shift 2 ;;
    --commit-prefixes) COMMIT_PREFIXES="${2:-fix,chore}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

mkdir -p "${RUNTIME_DIR}/logs" "${RUNTIME_DIR}/status"
LOG_FILE="${RUNTIME_DIR}/logs/${AGENT}.log"
STATUS_FILE="${RUNTIME_DIR}/status/${AGENT}.status"

touch "${LOG_FILE}"

echo "starting agent=${AGENT} branch=${BRANCH} mode=${MODE}" >> "${LOG_FILE}"

idle=0
cycle=0
while (( MAX_IDLE <= 0 || idle < MAX_IDLE )); do
  cycle=$((cycle + 1))
  printf "RUNNING cycle=%s idle=%s\n" "${cycle}" "${idle}" > "${STATUS_FILE}"

  git -C "${WORKTREE}" fetch origin >> "${LOG_FILE}" 2>&1 || true
  git -C "${WORKTREE}" checkout "${BRANCH}" >> "${LOG_FILE}" 2>&1 || true
  git -C "${WORKTREE}" pull --ff-only origin "${BRANCH}" >> "${LOG_FILE}" 2>&1 || true

  before_head="$(git -C "${WORKTREE}" rev-parse HEAD)"

  read -r -d '' PROMPT <<PROMPT || true
You are AgentFix worker ${AGENT}.

Load and use these skills: ${SKILLS}

Strict scope:
${SCOPE_TEXT}

Execution rules:
1. Find and fix only P0/P1/P2 bugs in scope.
2. Keep patches minimal and test-backed.
3. Run validations:
${TESTS_TEXT}
4. Commit only if subject starts with one of: ${COMMIT_PREFIXES}
5. Push branch ${BRANCH} when checks pass.
PROMPT

  codex --${MODE} "${PROMPT}" >> "${LOG_FILE}" 2>&1 || true

  after_head="$(git -C "${WORKTREE}" rev-parse HEAD)"
  if [[ "${before_head}" == "${after_head}" ]]; then
    idle=$((idle + 1))
  else
    idle=0
  fi

  sleep "${INTERVAL_SEC}"
done

printf "DONE reason=idle_limit\n" > "${STATUS_FILE}"

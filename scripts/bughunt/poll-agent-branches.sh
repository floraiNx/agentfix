#!/usr/bin/env bash
set -euo pipefail

BASE_BRANCH="dev"
REMOTE_NAME="origin"
CONFIG_FILE=""
GATE_CMD=""
AUTO_PUSH=0
DRY_RUN=0
DEDUPE_HISTORY=300

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE_BRANCH="${2:-dev}"; shift 2 ;;
    --remote) REMOTE_NAME="${2:-origin}"; shift 2 ;;
    --config) CONFIG_FILE="${2:-}"; shift 2 ;;
    --gate-cmd) GATE_CMD="${2:-}"; shift 2 ;;
    --push) AUTO_PUSH=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --dedupe-history) DEDUPE_HISTORY="${2:-300}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "${REPO_ROOT}"

git fetch "${REMOTE_NAME}" --prune

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "${BASE_BRANCH}" ]]; then
  echo "Switch to ${BASE_BRANCH} before polling" >&2
  exit 1
fi

if [[ ${DRY_RUN} -eq 0 ]]; then
  git reset --hard "${REMOTE_NAME}/${BASE_BRANCH}" >/dev/null
fi

branches=()
if [[ -n "${CONFIG_FILE}" ]]; then
  while IFS= read -r line; do
    [[ -z "${line}" || "${line}" =~ ^# ]] && continue
    branches+=("${line}")
  done < "${CONFIG_FILE}"
else
  while IFS= read -r ref; do
    branches+=("${ref#refs/remotes/${REMOTE_NAME}/}")
  done < <(git for-each-ref --format='%(refname)' "refs/remotes/${REMOTE_NAME}/agentfix/bughunt-*")
fi

sig_file="$(mktemp)"
trap 'rm -f "${sig_file}"' EXIT

git rev-list --max-count "${DEDUPE_HISTORY}" "${BASE_BRANCH}" | while read -r commit; do
  git show -s --format=%s "${commit}" | tr '[:upper:]' '[:lower:]' | sed -E 's/^[a-z]+(\([^)]+\))?:\s*//' >> "${sig_file}"
done
sort -u "${sig_file}" -o "${sig_file}"

picked=0
for branch in "${branches[@]}"; do
  remote_ref="${REMOTE_NAME}/${branch}"
  git show-ref --verify --quiet "refs/remotes/${remote_ref}" || continue

  mapfile -t commits < <(git cherry "${BASE_BRANCH}" "${remote_ref}" | awk '/^\+/{print $2}' | tac)
  for commit in "${commits[@]}"; do
    subject="$(git show -s --format=%s "${commit}" | tr '[:upper:]' '[:lower:]' | sed -E 's/^[a-z]+(\([^)]+\))?:\s*//')"
    if grep -Fqx "${subject}" "${sig_file}"; then
      echo "skip duplicate ${commit} (${subject})"
      continue
    fi

    if [[ ${DRY_RUN} -eq 1 ]]; then
      echo "would pick ${commit} from ${branch}"
      echo "${subject}" >> "${sig_file}"
      continue
    fi

    if git cherry-pick "${commit}"; then
      echo "picked ${commit} from ${branch}"
      echo "${subject}" >> "${sig_file}"
      picked=$((picked + 1))
    else
      echo "conflict on ${commit}, aborting pick" >&2
      git cherry-pick --abort
    fi
  done
done

if [[ ${picked} -gt 0 && -n "${GATE_CMD}" && ${DRY_RUN} -eq 0 ]]; then
  bash -lc "${GATE_CMD}"
fi

if [[ ${picked} -gt 0 && ${AUTO_PUSH} -eq 1 && ${DRY_RUN} -eq 0 ]]; then
  git push "${REMOTE_NAME}" "${BASE_BRANCH}"
fi

echo "picked=${picked}"

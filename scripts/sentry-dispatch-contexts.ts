#!/usr/bin/env bun

import { loadConfig } from "../src/config/load-config";
import { runAutoFix } from "../src/modes/auto-fix";

const DISPATCH_MARKER = "<!-- agentfix-sentry-dispatch -->";

type DispatchContext = {
  ghIssueNumber: number;
  shortId: string;
  project: string;
  trackingState: "created" | "reopened" | "requeued";
  event: {
    source: "sentry";
    repository: string;
    targetBranch: string;
    issueRef: string;
    findings: Array<{ file: string; summary: string }>;
  };
};

const args = process.argv.slice(2);
function flag(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const inputFile = flag("input", process.env.SENTRY_FIX_CONTEXTS_FILE || "/tmp/sentry-fix-contexts.json");
const repository = process.env.GITHUB_REPOSITORY || "";
const token = process.env.GITHUB_TOKEN || "";

async function ghComment(issueNumber: number, body: string): Promise<void> {
  if (!token || !repository) return;
  const [owner, repo] = repository.split("/");

  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "agentfix",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ body })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to post issue comment #${issueNumber}: ${response.status} ${text.slice(0, 220)}`);
  }
}

async function main() {
  const text = await Bun.file(inputFile).text();
  const contexts = (JSON.parse(text) as DispatchContext[]) || [];

  if (contexts.length === 0) {
    console.log("No contexts selected for dispatch.");
    return;
  }

  const config = loadConfig();
  let failures = 0;

  for (const context of contexts) {
    const result = await runAutoFix(config, context.event, false);

    const body = [
      DISPATCH_MARKER,
      "",
      `Sentry context: ${context.shortId} (${context.project})`,
      `Tracking state: ${context.trackingState}`,
      `Dispatch result: ${result.ok ? "ok" : "failed"}`,
      result.ok ? "" : `Reason: ${result.message}`
    ].join("\n");

    try {
      await ghComment(context.ghIssueNumber, body);
    } catch (error) {
      console.warn(error instanceof Error ? error.message : String(error));
    }

    if (!result.ok) {
      failures += 1;
    }

    console.log(
      JSON.stringify(
        {
          shortId: context.shortId,
          issueNumber: context.ghIssueNumber,
          ok: result.ok,
          message: result.message
        },
        null,
        2
      )
    );
  }

  if (failures > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

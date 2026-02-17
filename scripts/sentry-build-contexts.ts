#!/usr/bin/env bun

type TrackedIssue = {
  id: string;
  project: string;
  shortId: string;
  title: string;
  culprit: string;
  count: string;
  level: string;
  firstSeen: string;
  lastSeen: string;
  stackTrace: string;
  tags?: Record<string, string>;
  ghIssueNumber: number;
  trackingState: "created" | "reopened" | "requeued";
};

type AutoFixEvent = {
  source: "sentry";
  repository: string;
  targetBranch: string;
  issueRef: string;
  findings: Array<{
    file: string;
    summary: string;
  }>;
};

type DispatchContext = {
  ghIssueNumber: number;
  shortId: string;
  project: string;
  trackingState: TrackedIssue["trackingState"];
  event: AutoFixEvent;
};

const args = process.argv.slice(2);
function flag(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const inputFile = flag("input", process.env.SENTRY_TO_FIX_FILE || "/tmp/sentry-to-fix.json");
const outputFile = flag("output", process.env.SENTRY_FIX_CONTEXTS_FILE || "/tmp/sentry-fix-contexts.json");
const maxFixes = Number.parseInt(flag("max", process.env.MAX_FIXES_PER_RUN || "3"), 10);
const targetBranch = flag("target-branch", process.env.TARGET_BRANCH || "dev");
const repository = process.env.GITHUB_REPOSITORY || "unknown/unknown";

function inferFileFromStackTrace(stackTrace: string): string {
  const lines = stackTrace.split("\n").map((line) => line.trim());

  for (const line of lines) {
    const match = line.match(/\(([^():]+(?:\.[a-zA-Z0-9]+)?):\d+:\d+\)/);
    if (match?.[1]) return match[1];

    const fallback = line.match(/at\s+[^\s]+\s+([^():]+(?:\.[a-zA-Z0-9]+)?):\d+:\d+/);
    if (fallback?.[1]) return fallback[1];
  }

  return "unknown";
}

function buildFindingSummary(issue: TrackedIssue): string {
  const short = issue.shortId || issue.id;
  const culprit = issue.culprit ? ` Culprit: ${issue.culprit}.` : "";
  return `[${short}] ${issue.title}.${culprit} Reproduce with a test and fix root cause.`;
}

async function main() {
  const text = await Bun.file(inputFile).text();
  const toFix = (JSON.parse(text) as TrackedIssue[]) || [];

  const selected = toFix.slice(0, Math.max(maxFixes, 0));
  const contexts: DispatchContext[] = selected.map((issue) => ({
    ghIssueNumber: issue.ghIssueNumber,
    shortId: issue.shortId,
    project: issue.project,
    trackingState: issue.trackingState,
    event: {
      source: "sentry",
      repository,
      targetBranch,
      issueRef: `Sentry-${issue.shortId}#${issue.ghIssueNumber}`,
      findings: [
        {
          file: inferFileFromStackTrace(issue.stackTrace || ""),
          summary: buildFindingSummary(issue)
        }
      ]
    }
  }));

  await Bun.write(outputFile, `${JSON.stringify(contexts, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        toFix: toFix.length,
        selected: contexts.length,
        outputFile
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

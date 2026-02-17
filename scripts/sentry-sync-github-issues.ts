#!/usr/bin/env bun

type SentryFetchedIssue = {
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
};

type GitHubIssue = {
  number: number;
  title: string;
  state: "open" | "closed";
  created_at: string;
  pull_request?: unknown;
};

type TrackedIssue = SentryFetchedIssue & {
  ghIssueNumber: number;
  trackingState: "created" | "reopened" | "requeued";
};

const TRACK_MARKER = "<!-- agentfix-sentry-track -->";
const DISPATCH_MARKER = "<!-- agentfix-sentry-dispatch -->";

const args = process.argv.slice(2);
function flag(name: string, fallback: string): string {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const inputFile = flag("input", process.env.SENTRY_ISSUES_FILE || "/tmp/sentry-issues.json");
const outputFile = flag("output", process.env.SENTRY_TO_FIX_FILE || "/tmp/sentry-to-fix.json");
const cooldownHours = Number.parseInt(flag("cooldown-hours", process.env.SENTRY_RETRY_COOLDOWN_HOURS || "24"), 10);

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;

if (!token) {
  console.error("GITHUB_TOKEN is required");
  process.exit(1);
}

if (!repository || !repository.includes("/")) {
  console.error("GITHUB_REPOSITORY is required (owner/repo)");
  process.exit(1);
}

const [owner, repo] = repository.split("/");

async function gh<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `https://api.github.com${path}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "agentfix",
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${response.status} ${path}: ${text.slice(0, 250)}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function listLabeledIssues(label: string): Promise<GitHubIssue[]> {
  const all: GitHubIssue[] = [];
  let page = 1;

  while (true) {
    const chunk = await gh<GitHubIssue[]>(
      `/repos/${owner}/${repo}/issues?state=all&labels=${encodeURIComponent(label)}&per_page=100&page=${page}`
    );

    if (chunk.length === 0) break;
    all.push(...chunk.filter((issue) => !issue.pull_request && !issue.title.startsWith("[Discussion]")));

    if (chunk.length < 100) break;
    page += 1;
  }

  return all;
}

async function listComments(issueNumber: number): Promise<Array<{ body: string; created_at: string }>> {
  const out: Array<{ body: string; created_at: string }> = [];
  let page = 1;

  while (true) {
    const chunk = await gh<Array<{ body?: string; created_at: string }>>(
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100&page=${page}`
    );

    if (chunk.length === 0) break;
    out.push(
      ...chunk.map((c) => ({
        body: c.body ?? "",
        created_at: c.created_at
      }))
    );

    if (chunk.length < 100) break;
    page += 1;
  }

  return out;
}

function parseLastDispatchTimestamp(comments: Array<{ body: string; created_at: string }>): number | null {
  const marked = comments
    .filter((comment) => comment.body.includes(DISPATCH_MARKER))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (marked.length === 0) return null;
  return new Date(marked[0]!.created_at).getTime();
}

function issueBody(issue: SentryFetchedIssue): string {
  return [
    TRACK_MARKER,
    "",
    "## Error Details",
    "",
    "| Field | Value |",
    "|---|---|",
    `| Project | \`${issue.project}\` |`,
    `| Sentry ID | \`${issue.shortId}\` |`,
    `| Level | ${issue.level} |`,
    `| Culprit | \`${issue.culprit || "unknown"}\` |`,
    `| Events | ${issue.count} |`,
    `| Last seen | ${issue.lastSeen} |`,
    "",
    "## Stack Trace",
    "",
    "```",
    issue.stackTrace || "No stack trace available",
    "```",
    "",
    "## Action Required",
    "",
    "1. Add/extend a test that reproduces the issue.",
    "2. Fix root cause with minimal scope.",
    "3. Link fix PR in this issue.",
    "",
    "_Created by AgentFix Sentry pipeline_"
  ].join("\n");
}

async function createIssue(issue: SentryFetchedIssue): Promise<number> {
  const created = await gh<{ number: number }>(`/repos/${owner}/${repo}/issues`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: `[Sentry ${issue.shortId}] ${issue.title}`,
      body: issueBody(issue),
      labels: ["bug", "needs-test", "sentry"]
    })
  });

  return created.number;
}

async function reopenIssue(issueNumber: number): Promise<void> {
  await gh(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "open" })
  });
}

async function comment(issueNumber: number, body: string): Promise<void> {
  await gh(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body })
  });
}

async function main() {
  const text = await Bun.file(inputFile).text();
  const sentryIssues = (JSON.parse(text) as SentryFetchedIssue[]) || [];

  const tracked = await listLabeledIssues("sentry");
  const toFix: TrackedIssue[] = [];
  let created = 0;
  let reopened = 0;
  let requeued = 0;
  let skipped = 0;

  for (const issue of sentryIssues) {
    const existing = tracked.find((trackedIssue) => trackedIssue.title.includes(`[Sentry ${issue.shortId}]`));

    if (!existing) {
      const ghIssueNumber = await createIssue(issue);
      created += 1;
      toFix.push({ ...issue, ghIssueNumber, trackingState: "created" });
      continue;
    }

    if (existing.state === "closed") {
      await reopenIssue(existing.number);
      await comment(
        existing.number,
        [
          TRACK_MARKER,
          "",
          "Sentry still reports this issue unresolved.",
          "Auto-reopened by AgentFix."
        ].join("\n")
      );
      reopened += 1;
      toFix.push({ ...issue, ghIssueNumber: existing.number, trackingState: "reopened" });
      continue;
    }

    const comments = await listComments(existing.number);
    const lastDispatchAt = parseLastDispatchTimestamp(comments);
    const fallback = new Date(existing.created_at).getTime();
    const lastAttemptAt = lastDispatchAt ?? fallback;
    const elapsedHours = (Date.now() - lastAttemptAt) / (1000 * 60 * 60);

    if (elapsedHours < cooldownHours) {
      skipped += 1;
      continue;
    }

    await comment(
      existing.number,
      [
        TRACK_MARKER,
        "",
        `Issue is still unresolved in Sentry and has been re-queued after ${cooldownHours}h cooldown.`
      ].join("\n")
    );
    requeued += 1;
    toFix.push({ ...issue, ghIssueNumber: existing.number, trackingState: "requeued" });
  }

  await Bun.write(outputFile, `${JSON.stringify(toFix, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        inputIssues: sentryIssues.length,
        toFix: toFix.length,
        created,
        reopened,
        requeued,
        skipped,
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

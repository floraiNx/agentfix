#!/usr/bin/env bun
/**
 * Fetch unresolved Sentry issues with latest event stack trace.
 *
 * Usage:
 *   SENTRY_AUTH_TOKEN=xxx bun scripts/sentry-fetch-issues.ts --projects acme-backend,acme-web --max 5
 */

type SentryIssue = {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  count: string;
  firstSeen: string;
  lastSeen: string;
  level: string;
  project?: { slug?: string };
};

type SentryFrame = {
  filename: string;
  function: string;
  lineNo: number;
  colNo: number;
  inApp: boolean;
};

type SentryEvent = {
  entries: Array<{
    type: string;
    data: {
      values?: Array<{
        type?: string;
        value?: string;
        stacktrace?: {
          frames?: SentryFrame[];
        };
      }>;
    };
  }>;
  tags?: Array<{ key: string; value: string }>;
};

const SENTRY_URL = process.env.SENTRY_URL || "https://sentry.io";
const SENTRY_AUTH_TOKEN = process.env.SENTRY_AUTH_TOKEN;
const SENTRY_ORG = process.env.SENTRY_ORG || "your-org";

if (!SENTRY_AUTH_TOKEN) {
  console.error("SENTRY_AUTH_TOKEN is required");
  process.exit(1);
}

const args = process.argv.slice(2);
function flag(name: string, fallback: string): string {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const projectsRaw = flag("projects", process.env.SENTRY_PROJECTS || "");
const projectRaw = flag("project", process.env.SENTRY_PROJECT || "");
const maxIssues = Number.parseInt(flag("max", process.env.MAX_ISSUES || "5"), 10);

const projectList = Array.from(
  new Set((projectRaw || projectsRaw).split(",").map((v) => v.trim()).filter(Boolean))
);

if (projectList.length === 0) {
  console.error("No Sentry projects configured. Use --projects or SENTRY_PROJECTS.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${SENTRY_AUTH_TOKEN}`,
  "Content-Type": "application/json"
};

async function api<T>(path: string): Promise<T | null> {
  const url = `${SENTRY_URL}${path}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`Sentry API ${res.status}: ${url}`);
    return null;
  }
  return (await res.json()) as T;
}

function stackTraceFromEvent(event: SentryEvent | null): string {
  if (!event) return "No event data available";
  const entry = event.entries.find((e) => e.type === "exception");
  if (!entry?.data?.values?.length) return "No stack trace available";

  return entry.data.values
    .map((value) => {
      const frames = (value.stacktrace?.frames ?? []).filter((f) => f.inApp).reverse();
      const frameLines = frames.map((f) => `  at ${f.function || "?"} (${f.filename}:${f.lineNo}:${f.colNo})`).join("\n");
      return `${value.type || "Error"}: ${value.value || ""}\n${frameLines}`.trim();
    })
    .join("\n\n");
}

async function main() {
  const perProject = await Promise.all(
    projectList.map(async (projectSlug) => {
      const issues = await api<SentryIssue[]>(
        `/api/0/projects/${SENTRY_ORG}/${projectSlug}/issues/?query=is:unresolved&sort=date&limit=${maxIssues}`
      );
      return issues ?? [];
    })
  );

  const issues = perProject.flat();
  const out = await Promise.all(
    issues.map(async (issue) => {
      const event = await api<SentryEvent>(`/api/0/organizations/${SENTRY_ORG}/issues/${issue.id}/events/latest/`);
      const tags = Object.fromEntries((event?.tags ?? []).map((t) => [t.key, t.value]));

      return {
        id: issue.id,
        project: issue.project?.slug ?? "unknown",
        shortId: issue.shortId,
        title: issue.title,
        culprit: issue.culprit,
        count: issue.count,
        level: issue.level,
        firstSeen: issue.firstSeen,
        lastSeen: issue.lastSeen,
        stackTrace: stackTraceFromEvent(event),
        tags
      };
    })
  );

  out.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
  console.log(JSON.stringify(out, null, 2));
}

main();

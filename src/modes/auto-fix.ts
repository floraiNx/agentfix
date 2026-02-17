import { dedupeFindings } from "../core/dedupe";
import type { AgentFixConfig } from "../config/schema";
import type { AutoFixEvent, DispatchResult } from "../types";
import { dispatchOpenClaw } from "../providers/openclaw";

function renderFindings(event: AutoFixEvent): string {
  return event.findings
    .map((finding, index) => {
      const linePart = typeof finding.line === "number" ? `:${finding.line}` : "";
      return `${index + 1}. ${finding.file}${linePart} -> ${finding.summary}`;
    })
    .join("\n");
}

export function buildAutoFixPrompt(event: AutoFixEvent): string {
  return [
    `You are AgentFix running automated remediation for repository ${event.repository}.`,
    `Target branch: ${event.targetBranch}`,
    `Issue reference: ${event.issueRef}`,
    "",
    "Required workflow:",
    "1) Sync latest branch state.",
    "2) Reproduce the issue with a test first.",
    "3) Implement minimal root-cause fix.",
    "4) Run project tests and type checks.",
    "5) Commit with scoped message and open draft PR.",
    "",
    "Findings:",
    renderFindings(event),
    "",
    "Do not broaden scope beyond listed findings unless required for safety."
  ].join("\n");
}

export async function runAutoFix(
  config: AgentFixConfig,
  event: AutoFixEvent,
  dryRun: boolean
): Promise<DispatchResult | { ok: true; message: string; prompt: string }> {
  const deduped = dedupeFindings(event.findings);
  const normalizedEvent = { ...event, findings: deduped };
  const prompt = buildAutoFixPrompt(normalizedEvent);

  if (dryRun) {
    return {
      ok: true,
      message: "Dry-run only. Dispatch skipped.",
      prompt
    };
  }

  const provider = config.providers.openclaw;
  const token = process.env[provider.tokenEnv] ?? "";

  if (!token) {
    return {
      ok: false,
      provider: "openclaw",
      model: provider.model,
      httpCode: 0,
      message: `Missing token env: ${provider.tokenEnv}`
    };
  }

  return dispatchOpenClaw({
    baseUrl: provider.baseUrl,
    token,
    model: provider.model,
    prompt
  });
}

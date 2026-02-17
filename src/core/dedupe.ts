import type { Finding } from "../types";

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9:/._ -]/g, "")
    .trim();
}

export function findingSignature(finding: Finding): string {
  const file = normalizeText(finding.file);
  const line = finding.line ?? 0;
  const summary = normalizeText(finding.summary)
    .replace(/^fix\b/g, "")
    .replace(/^issue\b/g, "")
    .trim();
  return `${file}:${line}:${summary}`;
}

export function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  const out: Finding[] = [];

  for (const finding of findings) {
    const sig = findingSignature(finding);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(finding);
  }

  return out;
}

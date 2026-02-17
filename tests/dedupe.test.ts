import { describe, expect, test } from "bun:test";
import { dedupeFindings, findingSignature } from "../src/core/dedupe";

describe("dedupe", () => {
  test("normalizes duplicate findings", () => {
    const findings = [
      { file: "src/a.ts", line: 10, summary: "Missing tenant check" },
      { file: "src/a.ts", line: 10, summary: "missing   tenant   check" },
      { file: "src/a.ts", line: 11, summary: "Missing tenant check" }
    ];

    const deduped = dedupeFindings(findings);
    expect(deduped.length).toBe(2);
  });

  test("signature is stable", () => {
    const sig1 = findingSignature({ file: "src/a.ts", line: 10, summary: "Fix race condition" });
    const sig2 = findingSignature({ file: "src/a.ts", line: 10, summary: "fix race condition" });
    expect(sig1).toBe(sig2);
  });
});

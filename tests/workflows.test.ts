import { describe, expect, test } from "bun:test";
import { prRemediationWorkflowTemplate, sentryGapWorkflowTemplate } from "../src/templates/workflows";

describe("workflow templates", () => {
  test("pr remediation template contains key sections", () => {
    const yaml = prRemediationWorkflowTemplate();
    expect(yaml).toContain("pull_request_review");
    expect(yaml).toContain("workflow_dispatch");
    expect(yaml).toContain("run autofix");
  });

  test("sentry gap template contains schedule", () => {
    const yaml = sentryGapWorkflowTemplate();
    expect(yaml).toContain("0 */4 * * *");
    expect(yaml).toContain("scripts/sentry-fetch-issues.ts");
    expect(yaml).toContain("scripts/sentry-sync-github-issues.ts");
    expect(yaml).toContain("scripts/sentry-dispatch-contexts.ts");
  });
});

import { describe, expect, test } from "bun:test";
import { extractFindingsFromReviewComments } from "../src/github/findings";

describe("extractFindingsFromReviewComments", () => {
  test("keeps only allowed reviewer comments", () => {
    const findings = extractFindingsFromReviewComments(
      [
        {
          path: "src/a.ts",
          line: 10,
          body: "Missing null check\nmore context",
          user: { login: "greptile[bot]" }
        },
        {
          path: "src/b.ts",
          line: 20,
          body: "Nit: rename variable",
          user: { login: "human-reviewer" }
        }
      ],
      ["greptile", "greptile[bot]"]
    );

    expect(findings.length).toBe(1);
    expect(findings[0]?.file).toBe("src/a.ts");
    expect(findings[0]?.summary).toBe("Missing null check");
  });

  test("returns fallback finding when no matching comments exist", () => {
    const findings = extractFindingsFromReviewComments(
      [
        {
          path: "src/a.ts",
          line: 10,
          body: "Looks good",
          user: { login: "human-reviewer" }
        }
      ],
      ["greptile"]
    );

    expect(findings.length).toBe(1);
    expect(findings[0]?.file).toBe("unknown");
  });
});

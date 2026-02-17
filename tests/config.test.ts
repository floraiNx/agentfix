import { describe, expect, test } from "bun:test";
import { agentFixConfigSchema } from "../src/config/schema";

describe("agentFixConfigSchema", () => {
  test("accepts minimal valid config", () => {
    const input = {
      version: 1,
      providers: {
        openclaw: {
          baseUrl: "https://openclaw.example.com",
          tokenEnv: "OPENCLAW_TOKEN",
          model: "openai-codex/gpt-5.3-codex"
        }
      },
      modes: {
        autoFix: {
          enabled: true,
          requireLabel: "auto-fix",
          maxAttempts: 2
        },
        bugHunt: {
          enabled: true,
          baseBranch: "dev",
          profile: "focused",
          commitPrefixes: ["fix", "chore"]
        }
      }
    };

    const result = agentFixConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("rejects invalid URL", () => {
    const input = {
      version: 1,
      providers: {
        openclaw: {
          baseUrl: "not-a-url",
          tokenEnv: "OPENCLAW_TOKEN",
          model: "x"
        }
      },
      modes: {
        autoFix: {
          enabled: true,
          requireLabel: "auto-fix",
          maxAttempts: 2
        },
        bugHunt: {
          enabled: true,
          baseBranch: "dev",
          profile: "focused",
          commitPrefixes: ["fix"]
        }
      }
    };

    const result = agentFixConfigSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

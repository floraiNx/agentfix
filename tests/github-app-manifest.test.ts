import { describe, expect, test } from "bun:test";
import { githubAppManifestTemplate } from "../src/templates/github-app-manifest";

describe("githubAppManifestTemplate", () => {
  test("renders valid manifest JSON with key permissions", () => {
    const out = githubAppManifestTemplate({
      appName: "AgentFix",
      appUrl: "https://agentfix.example.com",
      webhookUrl: "https://agentfix.example.com/webhooks/github",
      callbackUrl: "https://agentfix.example.com/auth/callback"
    });

    const manifest = JSON.parse(out) as Record<string, unknown>;
    expect(manifest.name).toBe("AgentFix");
    expect(manifest.hook_attributes).toBeDefined();

    const permissions = manifest.default_permissions as Record<string, string>;
    expect(permissions.pull_requests).toBe("read");
    expect(permissions.issues).toBe("write");
  });
});

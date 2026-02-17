import { createHmac, generateKeyPairSync } from "node:crypto";
import { describe, expect, test } from "bun:test";
import { buildGitHubAppJwt, normalizePrivateKey } from "../src/github/app-auth";
import { verifyGitHubWebhookSignature } from "../src/github/webhook-signature";

describe("GitHub app auth", () => {
  test("normalizes escaped private key", () => {
    const raw = "line1\\nline2";
    expect(normalizePrivateKey(raw)).toBe("line1\nline2");
  });

  test("builds a signed JWT with three segments", () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs1", format: "pem" }).toString();

    const jwt = buildGitHubAppJwt("123", pem, 1_700_000_000);
    expect(jwt.split(".").length).toBe(3);
    expect(jwt.startsWith("ey")).toBe(true);
  });
});

describe("webhook signature", () => {
  test("accepts valid signature", () => {
    const body = JSON.stringify({ hello: "world" });
    const secret = "test-secret";
    const digest = createHmac("sha256", secret).update(body).digest("hex");
    const signature = `sha256=${digest}`;

    expect(verifyGitHubWebhookSignature(body, signature, secret)).toBe(true);
  });

  test("rejects invalid signature", () => {
    const body = JSON.stringify({ hello: "world" });
    expect(verifyGitHubWebhookSignature(body, "sha256=deadbeef", "test-secret")).toBe(false);
  });
});

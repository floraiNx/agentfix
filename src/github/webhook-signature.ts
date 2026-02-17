import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGitHubWebhookSignature(rawBody: string, signatureHeader: string | undefined, secret: string): boolean {
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const signatureHex = signatureHeader.slice("sha256=".length);
  const expectedHex = createHmac("sha256", secret).update(rawBody).digest("hex");

  const signatureBuffer = Buffer.from(signatureHex, "hex");
  const expectedBuffer = Buffer.from(expectedHex, "hex");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}

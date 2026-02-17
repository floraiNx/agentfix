import Fastify from "fastify";
import type { AgentFixConfig } from "../config/schema";
import { runAutoFix } from "../modes/auto-fix";
import type { AutoFixEvent } from "../types";

type GitHubReviewWebhook = {
  review?: {
    state?: string;
    user?: {
      login?: string;
    };
  };
  repository?: {
    full_name?: string;
  };
  pull_request?: {
    number?: number;
    head?: {
      ref?: string;
    };
  };
};

function toAutoFixEvent(payload: GitHubReviewWebhook): AutoFixEvent | null {
  if (payload.review?.state !== "changes_requested") return null;
  if (!payload.repository?.full_name) return null;
  if (!payload.pull_request?.head?.ref) return null;

  return {
    source: "greptile",
    repository: payload.repository.full_name,
    targetBranch: payload.pull_request.head.ref,
    issueRef: `PR-${payload.pull_request.number ?? "unknown"}`,
    findings: [
      {
        file: "unknown",
        summary: "Review requested changes. Attach finding parser for inline comments."
      }
    ]
  };
}

export function createServer(config: AgentFixConfig) {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));

  app.post("/webhooks/github", async (request, reply) => {
    const payload = request.body as GitHubReviewWebhook;
    const event = toAutoFixEvent(payload);

    if (!event) {
      return reply.status(202).send({ ok: true, message: "Event ignored" });
    }

    if (!config.modes.autoFix.enabled) {
      return reply.status(202).send({ ok: true, message: "autoFix mode is disabled" });
    }

    const result = await runAutoFix(config, event, false);
    return reply.status(result.ok ? 200 : 502).send(result);
  });

  return app;
}

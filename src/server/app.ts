import Fastify from "fastify";
import type { AgentFixConfig } from "../config/schema";
import { runAutoFix } from "../modes/auto-fix";
import type { AutoFixEvent } from "../types";
import {
  createInstallationToken,
  listPullRequestReviewComments,
  parseRepository,
  postIssueComment,
  type GitHubAppRuntimeConfig
} from "../github/app-auth";
import { verifyGitHubWebhookSignature } from "../github/webhook-signature";
import { extractFindingsFromReviewComments } from "../github/findings";
import { warn } from "../core/logger";

type GitHubPullRequestReviewWebhook = {
  action?: string;
  installation?: {
    id?: number;
  };
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

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value[0];
  return value;
}

function getGitHubRuntimeConfig(config: AgentFixConfig): GitHubAppRuntimeConfig {
  const appId = process.env[config.githubApp.appIdEnv] ?? "";
  const privateKey = process.env[config.githubApp.privateKeyEnv] ?? "";
  const webhookSecret = process.env[config.githubApp.webhookSecretEnv] ?? "";

  if (!appId || !privateKey || !webhookSecret) {
    throw new Error(
      `Missing GitHub App envs. Required: ${config.githubApp.appIdEnv}, ${config.githubApp.privateKeyEnv}, ${config.githubApp.webhookSecretEnv}`
    );
  }

  return {
    appId,
    privateKey,
    webhookSecret,
    apiBaseUrl: config.githubApp.apiBaseUrl
  };
}

function toAutoFixEvent(payload: GitHubPullRequestReviewWebhook, findings: AutoFixEvent["findings"]): AutoFixEvent | null {
  if (payload.review?.state !== "changes_requested") return null;
  if (!payload.repository?.full_name) return null;
  if (!payload.pull_request?.head?.ref) return null;

  return {
    source: "greptile",
    repository: payload.repository.full_name,
    targetBranch: payload.pull_request.head.ref,
    issueRef: `PR-${payload.pull_request.number ?? "unknown"}`,
    findings
  };
}

export function createServer(config: AgentFixConfig) {
  const app = Fastify({ logger: true });

  app.addContentTypeParser("application/json", { parseAs: "string" }, (_request, body, done) => {
    done(null, body);
  });

  app.get("/health", async () => ({ ok: true }));

  app.get("/app/meta", async () => {
    const hasAppId = Boolean(process.env[config.githubApp.appIdEnv]);
    const hasPrivateKey = Boolean(process.env[config.githubApp.privateKeyEnv]);
    const hasWebhookSecret = Boolean(process.env[config.githubApp.webhookSecretEnv]);

    return {
      ok: true,
      githubAppEnabled: config.githubApp.enabled,
      envReady: hasAppId && hasPrivateKey && hasWebhookSecret,
      requiredEnvs: {
        appIdEnv: config.githubApp.appIdEnv,
        privateKeyEnv: config.githubApp.privateKeyEnv,
        webhookSecretEnv: config.githubApp.webhookSecretEnv
      }
    };
  });

  app.post("/webhooks/github", async (request, reply) => {
    const rawBody = typeof request.body === "string" ? request.body : "";
    const signatureHeader = getHeaderValue(request.headers["x-hub-signature-256"]);
    const eventType = getHeaderValue(request.headers["x-github-event"]);

    if (!eventType) {
      return reply.status(400).send({ ok: false, message: "Missing x-github-event header" });
    }

    if (!config.githubApp.enabled) {
      return reply.status(202).send({ ok: true, message: "githubApp mode disabled in config" });
    }

    let runtime: GitHubAppRuntimeConfig;
    try {
      runtime = getGitHubRuntimeConfig(config);
    } catch (error) {
      return reply.status(500).send({ ok: false, message: error instanceof Error ? error.message : "Missing runtime config" });
    }

    if (!verifyGitHubWebhookSignature(rawBody, signatureHeader, runtime.webhookSecret)) {
      return reply.status(401).send({ ok: false, message: "Invalid webhook signature" });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return reply.status(400).send({ ok: false, message: "Invalid JSON payload" });
    }

    if (eventType === "ping") {
      return reply.status(200).send({ ok: true, message: "pong" });
    }

    if (eventType !== "pull_request_review") {
      return reply.status(202).send({ ok: true, message: `Ignored event: ${eventType}` });
    }

    if (!config.modes.autoFix.enabled) {
      return reply.status(202).send({ ok: true, message: "autoFix mode is disabled" });
    }

    const reviewPayload = payload as GitHubPullRequestReviewWebhook;
    if (reviewPayload.action !== "submitted" || reviewPayload.review?.state !== "changes_requested") {
      return reply.status(202).send({ ok: true, message: "Review action/state not eligible" });
    }

    if (!reviewPayload.installation?.id || !reviewPayload.repository?.full_name || !reviewPayload.pull_request?.number) {
      return reply.status(400).send({ ok: false, message: "Missing required installation/repository/PR fields" });
    }

    const { owner, repo } = parseRepository(reviewPayload.repository.full_name);

    let result: Awaited<ReturnType<typeof runAutoFix>>;
    let tokenInfo: { token: string; expiresAt: string };
    try {
      tokenInfo = await createInstallationToken(runtime, reviewPayload.installation.id);
      const comments = await listPullRequestReviewComments(
        runtime,
        tokenInfo.token,
        owner,
        repo,
        reviewPayload.pull_request.number
      );

      const findings = extractFindingsFromReviewComments(comments, config.githubApp.reviewAuthors);
      const event = toAutoFixEvent(reviewPayload, findings);

      if (!event) {
        return reply.status(202).send({ ok: true, message: "No actionable auto-fix event" });
      }

      result = await runAutoFix(config, event, false);
    } catch (error) {
      return reply.status(502).send({
        ok: false,
        message: error instanceof Error ? error.message : "GitHub App flow failed"
      });
    }

    const commentBody = result.ok
      ? "AgentFix: auto-fix dispatched successfully."
      : `AgentFix: auto-fix dispatch failed (${result.message}).`;

    try {
      await postIssueComment(runtime, tokenInfo.token, owner, repo, reviewPayload.pull_request.number, commentBody);
    } catch (error) {
      warn("Failed to post PR comment", {
        repository: `${owner}/${repo}`,
        pullNumber: reviewPayload.pull_request.number,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return reply.status(result.ok ? 200 : 502).send(result);
  });

  return app;
}

#!/usr/bin/env bun
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "./config/load-config";
import { info, fail } from "./core/logger";
import { createServer } from "./server/app";
import { defaultConfigYaml } from "./templates/default-config";
import { prRemediationWorkflowTemplate, sentryGapWorkflowTemplate } from "./templates/workflows";
import type { AutoFixEvent } from "./types";
import { runAutoFix } from "./modes/auto-fix";
import { runBugHunt } from "./modes/bug-hunt";

function parseArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function ensureFile(path: string, content: string): void {
  if (existsSync(path)) {
    info(`skip existing file: ${path}`);
    return;
  }
  writeFileSync(path, content, "utf8");
  info(`created: ${path}`);
}

async function cmdInit(): Promise<void> {
  ensureFile(resolve(process.cwd(), ".agentfix.yml"), `${defaultConfigYaml()}\n`);

  const workflowsDir = resolve(process.cwd(), ".github/workflows");
  mkdirSync(workflowsDir, { recursive: true });
  ensureFile(resolve(workflowsDir, "agentfix-pr-remediation.yml"), `${prRemediationWorkflowTemplate()}\n`);
  ensureFile(resolve(workflowsDir, "agentfix-sentry-gap.yml"), `${sentryGapWorkflowTemplate()}\n`);

  info("init complete");
}

async function cmdServe(): Promise<void> {
  const config = loadConfig();
  const port = Number(parseArg("--port") ?? "8787");
  const app = createServer(config);
  await app.listen({ port, host: "0.0.0.0" });
  info(`server listening on ${port}`);
}

async function cmdRunAutoFix(): Promise<void> {
  const eventFile = parseArg("--event-file");
  if (!eventFile) fail("Missing required flag --event-file");

  const config = loadConfig();
  const raw = readFileSync(resolve(process.cwd(), eventFile), "utf8");
  const event = JSON.parse(raw) as AutoFixEvent;
  const result = await runAutoFix(config, event, hasFlag("--dry-run"));

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

async function cmdRunBugHunt(): Promise<void> {
  const config = loadConfig();
  const result = await runBugHunt(config, {
    sessionRoot: parseArg("--session-root"),
    dryRun: hasFlag("--dry-run")
  });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

function printHelp(): void {
  console.log([
    "AgentFix CLI",
    "",
    "Commands:",
    "  init",
    "  serve [--port 8787]",
    "  run autofix --event-file <path> [--dry-run]",
    "  run bughunt [--session-root <path>] [--dry-run]"
  ].join("\n"));
}

async function main(): Promise<void> {
  const [, , command, subCommand] = process.argv;

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    await cmdInit();
    return;
  }

  if (command === "serve") {
    await cmdServe();
    return;
  }

  if (command === "run" && subCommand === "autofix") {
    await cmdRunAutoFix();
    return;
  }

  if (command === "run" && subCommand === "bughunt") {
    await cmdRunBugHunt();
    return;
  }

  fail(`Unknown command: ${process.argv.slice(2).join(" ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

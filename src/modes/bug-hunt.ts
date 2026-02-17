import { resolve } from "node:path";
import { spawn } from "node:child_process";
import type { AgentFixConfig } from "../config/schema";

export type BugHuntRunOptions = {
  sessionRoot?: string;
  dryRun: boolean;
};

export function buildBugHuntCommand(config: AgentFixConfig, options: BugHuntRunOptions): string[] {
  const script = resolve(process.cwd(), "scripts/bughunt/start-autonomous-bughunt.sh");
  const args = [
    script,
    "--base",
    config.modes.bugHunt.baseBranch,
    "--profile",
    config.modes.bugHunt.profile
  ];

  if (options.sessionRoot) {
    args.push("--session-root", options.sessionRoot);
  }

  if (config.modes.bugHunt.gateCommand) {
    args.push("--gate-cmd", config.modes.bugHunt.gateCommand);
  }

  args.push("--commit-prefixes", config.modes.bugHunt.commitPrefixes.join(","));
  return args;
}

export async function runBugHunt(config: AgentFixConfig, options: BugHuntRunOptions): Promise<{ ok: boolean; message: string; command: string }> {
  const cmd = buildBugHuntCommand(config, options);
  const printable = cmd.join(" ");

  if (options.dryRun) {
    return {
      ok: true,
      message: "Dry-run only. No processes started.",
      command: printable
    };
  }

  return await new Promise((resolveRun) => {
    const child = spawn("bash", cmd, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: process.env
    });

    child.on("close", (code) => {
      resolveRun({
        ok: code === 0,
        message: code === 0 ? "Bug-hunt orchestrator started." : `Bug-hunt start failed with code ${code}`,
        command: printable
      });
    });
  });
}

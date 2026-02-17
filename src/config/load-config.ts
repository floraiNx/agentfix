import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import { agentFixConfigSchema, type AgentFixConfig } from "./schema";
import { fail } from "../core/logger";

export function loadConfig(pathArg = ".agentfix.yml"): AgentFixConfig {
  const filePath = resolve(process.cwd(), pathArg);

  if (!existsSync(filePath)) {
    fail(`Config not found at ${filePath}`);
  }

  const raw = readFileSync(filePath, "utf8");
  const parsed = YAML.parse(raw);
  const result = agentFixConfigSchema.safeParse(parsed);

  if (!result.success) {
    fail("Invalid .agentfix.yml", result.error.flatten());
  }

  return result.data;
}

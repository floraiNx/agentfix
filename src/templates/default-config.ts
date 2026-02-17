export function defaultConfigYaml(): string {
  return [
    "version: 1",
    "providers:",
    "  openclaw:",
    "    baseUrl: https://openclaw.example.com",
    "    tokenEnv: OPENCLAW_TOKEN",
    "    model: openai-codex/gpt-5.3-codex",
    "modes:",
    "  autoFix:",
    "    enabled: true",
    "    requireLabel: auto-fix",
    "    maxAttempts: 2",
    "    gateCommand: bun run test",
    "  bugHunt:",
    "    enabled: true",
    "    baseBranch: dev",
    "    profile: focused",
    "    gateCommand: bun run test",
    "    commitPrefixes: [fix, chore]"
  ].join("\n");
}

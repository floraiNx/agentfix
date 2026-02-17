export function defaultConfigYaml(): string {
  return [
    "version: 1",
    "providers:",
    "  openclaw:",
    "    baseUrl: https://openclaw.example.com",
    "    tokenEnv: OPENCLAW_TOKEN",
    "    model: openai-codex/gpt-5.3-codex",
    "githubApp:",
    "  enabled: true",
    "  appIdEnv: GITHUB_APP_ID",
    "  privateKeyEnv: GITHUB_APP_PRIVATE_KEY",
    "  webhookSecretEnv: GITHUB_WEBHOOK_SECRET",
    "  apiBaseUrl: https://api.github.com",
    "  reviewAuthors: [\"greptile\", \"greptile[bot]\"]",
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

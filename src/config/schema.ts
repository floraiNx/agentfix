import { z } from "zod";

const openClawSchema = z.object({
  baseUrl: z.string().url(),
  tokenEnv: z.string().min(1).default("OPENCLAW_TOKEN"),
  model: z.string().min(1).default("openai-codex/gpt-5.3-codex")
});

const autoFixSchema = z.object({
  enabled: z.boolean().default(true),
  requireLabel: z.string().min(1).default("auto-fix"),
  maxAttempts: z.number().int().min(1).max(10).default(2),
  gateCommand: z.string().min(1).optional()
});

const bugHuntSchema = z.object({
  enabled: z.boolean().default(true),
  baseBranch: z.string().min(1).default("dev"),
  profile: z.enum(["focused", "full"]).default("focused"),
  gateCommand: z.string().min(1).optional(),
  commitPrefixes: z.array(z.string().min(1)).default(["fix", "chore"])
});

const githubAppSchema = z.object({
  enabled: z.boolean().default(true),
  appIdEnv: z.string().min(1).default("GITHUB_APP_ID"),
  privateKeyEnv: z.string().min(1).default("GITHUB_APP_PRIVATE_KEY"),
  webhookSecretEnv: z.string().min(1).default("GITHUB_WEBHOOK_SECRET"),
  apiBaseUrl: z.string().url().default("https://api.github.com"),
  reviewAuthors: z.array(z.string().min(1)).default(["greptile", "greptile[bot]"])
});

export const agentFixConfigSchema = z.object({
  version: z.literal(1).default(1),
  providers: z.object({
    openclaw: openClawSchema
  }),
  githubApp: githubAppSchema.default({}),
  modes: z.object({
    autoFix: autoFixSchema,
    bugHunt: bugHuntSchema
  })
});

export type AgentFixConfig = z.infer<typeof agentFixConfigSchema>;

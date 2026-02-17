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

export const agentFixConfigSchema = z.object({
  version: z.literal(1).default(1),
  providers: z.object({
    openclaw: openClawSchema
  }),
  modes: z.object({
    autoFix: autoFixSchema,
    bugHunt: bugHuntSchema
  })
});

export type AgentFixConfig = z.infer<typeof agentFixConfigSchema>;

import { z } from "zod";

// devops/environments.md §6 + RULE-deployment.md: validated at startup by a
// Zod schema in every environment. A missing or malformed variable fails the
// boot, not the first request that needs it. No secret carries a
// NEXT_PUBLIC_ prefix (RULE-security.md).
const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  ML_SERVICE_URL: z.string().url(),
  NEXT_PUBLIC_MAP_TILE_URL: z.string().url(),
  // ADR-023: the shared code that unlocks the ADMIN prototype role, and the
  // key its signed cookie derives from. Long enough that the 30/min role
  // switch rate limit makes guessing it impractical.
  ADMIN_ACCESS_CODE: z.string().min(12),
  REDIS_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  GROQ_API_KEY: z.string().min(20).optional(),
  // DEC-016: tried when GROQ_API_KEY is rate-limited, rejected or Groq errors.
  GROQ_API_KEY_FALLBACK: z.string().min(20).optional(),
  GROQ_CHAT_MODEL: z.string().default("openai/gpt-oss-20b"),
  GROQ_TRANSCRIPTION_MODEL: z.string().default("whisper-large-v3-turbo"),
  NEXT_PUBLIC_APP_NAME: z.string().default("CyberPulse AI"),
  NEXT_PUBLIC_DEMO_MODE: z.enum(["true", "false"]).default("true"),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.enum(["true", "false"]).default("true"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  APP_VERSION: z.string().default("0.1.0"),
  DATA_SEED: z.coerce.number().int().default(26184),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Thrown at module load — the process cannot boot with a missing or
  // malformed variable (RULE-deployment.md §Configuration).
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = {
  ...parsed.data,
  NEXT_PUBLIC_DEMO_MODE: parsed.data.NEXT_PUBLIC_DEMO_MODE === "true",
  NEXT_PUBLIC_ANALYTICS_ENABLED: parsed.data.NEXT_PUBLIC_ANALYTICS_ENABLED === "true",
};

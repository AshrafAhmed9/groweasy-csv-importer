import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  AI_PROVIDER: z.enum(["groq", "gemini"]).default("groq"),
  GROQ_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default("*"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BATCH_SIZE: z.coerce.number().int().positive().default(40),
  BATCH_CONCURRENCY: z.coerce.number().int().positive().default(2),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment configuration:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  const env = parsed.data;
  if (env.AI_PROVIDER === "groq" && !env.GROQ_API_KEY) {
    console.error("AI_PROVIDER=groq requires GROQ_API_KEY to be set.");
    process.exit(1);
  }
  if (env.AI_PROVIDER === "gemini" && !env.GEMINI_API_KEY) {
    console.error("AI_PROVIDER=gemini requires GEMINI_API_KEY to be set.");
    process.exit(1);
  }
  return env;
}

export const env = loadEnv();

import { env } from "../../config/env.js";
import type { AiProvider } from "./provider.js";
import { GroqProvider } from "./groq.provider.js";
import { GeminiProvider } from "./gemini.provider.js";

/** Selects the active AI provider from AI_PROVIDER. Adding a new vendor means one new file + one case here. */
export function createAiProvider(): AiProvider {
  switch (env.AI_PROVIDER) {
    case "groq":
      return new GroqProvider();
    case "gemini":
      return new GeminiProvider();
  }
}

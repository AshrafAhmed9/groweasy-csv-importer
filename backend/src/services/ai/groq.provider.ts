import { env } from "../../config/env.js";
import type { ColumnMapping, RawAiRecord } from "../../types/crm.js";
import {
  AiExtractionError,
  type AiProvider,
  type BatchExtractionInput,
  type BatchExtractionOutput,
} from "./provider.js";
import { buildBatchUserPrompt, buildSystemPrompt } from "./prompt.js";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME = "llama-3.3-70b-versatile";

interface GroqResponseShape {
  records: RawAiRecord[];
  columnMappings: ColumnMapping[];
}

/**
 * Groq's free tier (OpenAI-compatible chat completions API) is the default
 * provider for this project: Google's Gemini free tier turned out to be
 * gated to 0 requests for some accounts/regions, while Groq requires no
 * billing card and offers generous free rate limits with fast inference.
 * Same AiProvider contract as gemini.provider.ts, so swapping is one line.
 */
export class GroqProvider implements AiProvider {
  constructor(private readonly apiKey: string = env.GROQ_API_KEY ?? "") {
    if (!this.apiKey) {
      throw new AiExtractionError("GROQ_API_KEY is not configured");
    }
  }

  async extractBatch(input: BatchExtractionInput): Promise<BatchExtractionOutput> {
    const rows = input.rows.map((data, i) => ({ rowIndex: input.rowIndices[i], data }));
    const userPrompt = buildBatchUserPrompt(input.headers, rows);

    let response: Response;
    try {
      response = await fetch(GROQ_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: buildSystemPrompt() },
            { role: "user", content: userPrompt },
          ],
        }),
      });
    } catch (err) {
      throw new AiExtractionError("Groq API request failed to send", err);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new AiExtractionError(`Groq API request failed: ${response.status} ${body}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new AiExtractionError("Groq returned an empty response");
    }

    let parsed: GroqResponseShape;
    try {
      parsed = JSON.parse(content) as GroqResponseShape;
    } catch (err) {
      throw new AiExtractionError("Groq returned malformed JSON", err);
    }

    if (!Array.isArray(parsed.records)) {
      throw new AiExtractionError("Groq response missing 'records' array");
    }

    return {
      records: parsed.records,
      columnMappings: Array.isArray(parsed.columnMappings) ? parsed.columnMappings : [],
    };
  }
}

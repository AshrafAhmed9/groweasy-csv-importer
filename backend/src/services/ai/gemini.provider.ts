import { GoogleGenAI, Type } from "@google/genai";
import { env } from "../../config/env.js";
import type { RawAiRecord, ColumnMapping } from "../../types/crm.js";
import { AiExtractionError, type AiProvider, type BatchExtractionInput, type BatchExtractionOutput } from "./provider.js";
import { buildBatchUserPrompt, buildSystemPrompt } from "./prompt.js";

const MODEL_NAME = "gemini-2.0-flash";

const CRM_RECORD_PROPERTIES = {
  rowIndex: { type: Type.INTEGER },
  created_at: { type: Type.STRING },
  name: { type: Type.STRING },
  email: { type: Type.STRING },
  country_code: { type: Type.STRING },
  mobile_without_country_code: { type: Type.STRING },
  company: { type: Type.STRING },
  city: { type: Type.STRING },
  state: { type: Type.STRING },
  country: { type: Type.STRING },
  lead_owner: { type: Type.STRING },
  crm_status: { type: Type.STRING },
  crm_note: { type: Type.STRING },
  data_source: { type: Type.STRING },
  possession_time: { type: Type.STRING },
  description: { type: Type.STRING },
} as const;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    records: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: CRM_RECORD_PROPERTIES,
        required: ["rowIndex"],
      },
    },
    columnMappings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceColumn: { type: Type.STRING },
          mappedField: { type: Type.STRING },
          confidence: { type: Type.STRING },
        },
        required: ["sourceColumn", "mappedField", "confidence"],
      },
    },
  },
  required: ["records", "columnMappings"],
};

interface GeminiResponseShape {
  records: RawAiRecord[];
  columnMappings: ColumnMapping[];
}

export class GeminiProvider implements AiProvider {
  private client: GoogleGenAI;

  constructor(apiKey: string = env.GEMINI_API_KEY ?? "") {
    if (!apiKey) {
      throw new AiExtractionError("GEMINI_API_KEY is not configured");
    }
    this.client = new GoogleGenAI({ apiKey });
  }

  async extractBatch(input: BatchExtractionInput): Promise<BatchExtractionOutput> {
    const rows = input.rows.map((data, i) => ({ rowIndex: input.rowIndices[i], data }));
    const userPrompt = buildBatchUserPrompt(input.headers, rows);

    let responseText: string | undefined;
    try {
      const response = await this.client.models.generateContent({
        model: MODEL_NAME,
        contents: userPrompt,
        config: {
          systemInstruction: buildSystemPrompt(),
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      });
      responseText = response.text;
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      throw new AiExtractionError(`Gemini API request failed: ${detail}`, err);
    }

    if (!responseText) {
      throw new AiExtractionError("Gemini returned an empty response");
    }

    let parsed: GeminiResponseShape;
    try {
      parsed = JSON.parse(responseText) as GeminiResponseShape;
    } catch (err) {
      throw new AiExtractionError("Gemini returned malformed JSON", err);
    }

    if (!Array.isArray(parsed.records)) {
      throw new AiExtractionError("Gemini response missing 'records' array");
    }

    return {
      records: parsed.records,
      columnMappings: Array.isArray(parsed.columnMappings) ? parsed.columnMappings : [],
    };
  }
}

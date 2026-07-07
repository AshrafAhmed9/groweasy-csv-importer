import type { ColumnMapping, RawAiRecord } from "../../types/crm.js";

export interface BatchExtractionInput {
  headers: string[];
  rows: Record<string, string>[];
  /** Absolute row indices (into the original CSV) matching `rows` positionally. */
  rowIndices: number[];
}

export interface BatchExtractionOutput {
  records: RawAiRecord[];
  columnMappings: ColumnMapping[];
}

/**
 * Abstraction over the underlying LLM so the extraction pipeline is not
 * coupled to a single vendor. Swapping providers (Gemini -> OpenAI ->
 * Claude) means adding one new file that implements this interface.
 */
export interface AiProvider {
  extractBatch(input: BatchExtractionInput): Promise<BatchExtractionOutput>;
}

export class AiExtractionError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "AiExtractionError";
  }
}

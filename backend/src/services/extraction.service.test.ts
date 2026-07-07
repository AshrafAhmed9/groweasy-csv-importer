import { describe, expect, it, vi } from "vitest";
import { runExtraction } from "./extraction.service.js";
import type { AiProvider, BatchExtractionInput, BatchExtractionOutput } from "./ai/provider.js";
import type { ParsedCsv } from "./csv.service.js";

function makeParsedCsv(rowCount: number): ParsedCsv {
  return {
    headers: ["name", "email"],
    rows: Array.from({ length: rowCount }, (_, i) => ({
      name: `Lead ${i}`,
      email: `lead${i}@example.com`,
    })),
  };
}

function echoProvider(): AiProvider {
  return {
    extractBatch: vi.fn(async (input: BatchExtractionInput): Promise<BatchExtractionOutput> => ({
      records: input.rowIndices.map((rowIndex, i) => ({
        rowIndex,
        name: input.rows[i].name,
        email: input.rows[i].email,
      })),
      columnMappings: [
        { sourceColumn: "name", mappedField: "name", confidence: "high" },
        { sourceColumn: "email", mappedField: "email", confidence: "high" },
      ],
    })),
  };
}

describe("runExtraction", () => {
  it("imports all rows when the provider succeeds", async () => {
    const parsed = makeParsedCsv(5);
    const provider = echoProvider();
    const result = await runExtraction(parsed, provider);

    expect(result.totals.totalRows).toBe(5);
    expect(result.totals.totalImported).toBe(5);
    expect(result.totals.totalSkipped).toBe(0);
    expect(result.imported[0].name).toBe("Lead 0");
    expect(result.columnMappings).toHaveLength(2);
  });

  it("reports progress incrementally as batches complete", async () => {
    const parsed = makeParsedCsv(3);
    const provider = echoProvider();
    const progressEvents: number[] = [];

    await runExtraction(parsed, provider, (p) => progressEvents.push(p.processed));

    expect(progressEvents.at(-1)).toBe(3);
  });

  it("marks rows as skipped when a batch fails after all retries, without crashing the import", async () => {
    const parsed = makeParsedCsv(2);
    const failingProvider: AiProvider = {
      extractBatch: vi.fn(async () => {
        throw new Error("simulated Gemini failure");
      }),
    };

    const result = await runExtraction(parsed, failingProvider);

    expect(result.totals.totalImported).toBe(0);
    expect(result.totals.totalSkipped).toBe(2);
    expect(result.skipped.every((s) => s.reason === "ai_processing_failed")).toBe(true);
    expect(failingProvider.extractBatch).toHaveBeenCalledTimes(3);
  }, 10000);

  it("recovers from a transient failure via retry", async () => {
    const parsed = makeParsedCsv(2);
    let callCount = 0;
    const flakyProvider: AiProvider = {
      extractBatch: vi.fn(async (input: BatchExtractionInput) => {
        callCount++;
        if (callCount < 2) throw new Error("transient error");
        return {
          records: input.rowIndices.map((rowIndex, i) => ({
            rowIndex,
            name: input.rows[i].name,
            email: input.rows[i].email,
          })),
          columnMappings: [],
        };
      }),
    };

    const result = await runExtraction(parsed, flakyProvider);
    expect(result.totals.totalImported).toBe(2);
  }, 10000);

  it("skips rows the AI omits from its response", async () => {
    const parsed = makeParsedCsv(2);
    const partialProvider: AiProvider = {
      extractBatch: vi.fn(async () => ({
        records: [{ rowIndex: 0, name: "Lead 0", email: "lead0@example.com" }],
        columnMappings: [],
      })),
    };

    const result = await runExtraction(parsed, partialProvider);
    expect(result.totals.totalImported).toBe(1);
    expect(result.totals.totalSkipped).toBe(1);
    expect(result.skipped[0].reason).toBe("malformed_row");
  });

  it("applies the contact-info skip rule via validation even when the AI succeeds", async () => {
    const parsed: ParsedCsv = {
      headers: ["name"],
      rows: [{ name: "No Contact Person" }],
    };
    const provider: AiProvider = {
      extractBatch: vi.fn(async (input: BatchExtractionInput) => ({
        records: input.rowIndices.map((rowIndex) => ({ rowIndex, name: "No Contact Person" })),
        columnMappings: [],
      })),
    };

    const result = await runExtraction(parsed, provider);
    expect(result.totals.totalSkipped).toBe(1);
    expect(result.skipped[0].reason).toBe("missing_contact_info");
  });
});

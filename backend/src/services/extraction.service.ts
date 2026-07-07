import pLimit from "p-limit";
import { env } from "../config/env.js";
import type { ParsedCsv } from "./csv.service.js";
import { validateAndNormalize } from "./validation.service.js";
import type { AiProvider, BatchExtractionOutput } from "./ai/provider.js";
import { AiExtractionError } from "./ai/provider.js";
import type { ColumnMapping, ImportResult, SkippedRecord } from "../types/crm.js";

export interface ExtractionProgress {
  processed: number;
  total: number;
  imported: number;
  skipped: number;
}

interface Batch {
  rowIndices: number[];
  rows: Record<string, string>[];
}

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractBatchWithRetry(
  provider: AiProvider,
  headers: string[],
  batch: Batch
): Promise<{ output: BatchExtractionOutput } | { failed: true }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await provider.extractBatch({
        headers,
        rows: batch.rows,
        rowIndices: batch.rowIndices,
      });
      return { output: result };
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        const backoff = BASE_BACKOFF_MS * 2 ** (attempt - 1) + Math.random() * 250;
        await sleep(backoff);
      }
    }
  }
  console.error(
    `Batch starting at row ${batch.rowIndices[0]} failed after ${MAX_RETRIES} attempts:`,
    lastError instanceof AiExtractionError ? lastError.message : lastError
  );
  return { failed: true };
}

/**
 * Splits parsed CSV rows into batches, extracts each concurrently (bounded
 * by BATCH_CONCURRENCY) with retry + exponential backoff, deterministically
 * re-validates every AI-returned record, and reports progress after each
 * batch completes. A batch that exhausts all retries never crashes the
 * whole import — its rows are marked skipped so partial failures degrade
 * gracefully instead of losing the entire upload.
 */
export async function runExtraction(
  parsed: ParsedCsv,
  provider: AiProvider,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ImportResult> {
  const { headers, rows } = parsed;
  const indexedRows = rows.map((data, i) => ({ rowIndex: i, data }));
  const batches: Batch[] = chunk(indexedRows, env.BATCH_SIZE).map((group) => ({
    rowIndices: group.map((r) => r.rowIndex),
    rows: group.map((r) => r.data),
  }));

  const limit = pLimit(env.BATCH_CONCURRENCY);
  const total = rows.length;
  let processed = 0;
  let importedCount = 0;
  let skippedCount = 0;

  const importedRecords: Array<{ rowIndex: number; record: ImportResult["imported"][number] }> = [];
  const skippedRecords: SkippedRecord[] = [];
  const columnMappingVotes = new Map<string, ColumnMapping>();

  const tasks = batches.map((batch) =>
    limit(async () => {
      const outcome = await extractBatchWithRetry(provider, headers, batch);

      if ("failed" in outcome) {
        for (const rowIndex of batch.rowIndices) {
          skippedRecords.push({
            rowIndex,
            rawData: rows[rowIndex] ?? {},
            reason: "ai_processing_failed",
            detail: "AI extraction failed for this batch after multiple retries.",
          });
        }
      } else {
        const { records, columnMappings } = outcome.output;
        for (const mapping of columnMappings) {
          if (!columnMappingVotes.has(mapping.sourceColumn)) {
            columnMappingVotes.set(mapping.sourceColumn, mapping);
          }
        }

        const byRowIndex = new Map(records.map((r) => [r.rowIndex, r]));
        for (const rowIndex of batch.rowIndices) {
          const raw = byRowIndex.get(rowIndex);
          const rawRowData = rows[rowIndex] ?? {};

          if (!raw) {
            skippedRecords.push({
              rowIndex,
              rawData: rawRowData,
              reason: "malformed_row",
              detail: "AI response did not include this row.",
            });
            continue;
          }

          const result = validateAndNormalize(raw, rawRowData);
          if (result.skipped) {
            skippedRecords.push(result.skip);
          } else {
            importedRecords.push({ rowIndex, record: result.record });
          }
        }
      }

      processed += batch.rowIndices.length;
      importedCount = importedRecords.length;
      skippedCount = skippedRecords.length;
      onProgress?.({ processed, total, imported: importedCount, skipped: skippedCount });
    })
  );

  await Promise.all(tasks);

  importedRecords.sort((a, b) => a.rowIndex - b.rowIndex);
  skippedRecords.sort((a, b) => a.rowIndex - b.rowIndex);

  return {
    imported: importedRecords.map((r) => r.record),
    skipped: skippedRecords,
    columnMappings: Array.from(columnMappingVotes.values()),
    totals: {
      totalRows: total,
      totalImported: importedRecords.length,
      totalSkipped: skippedRecords.length,
    },
  };
}

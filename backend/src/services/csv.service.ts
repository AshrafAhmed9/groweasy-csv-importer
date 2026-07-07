import Papa from "papaparse";

export class CsvParseError extends Error {}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parses raw CSV text into normalized rows, stripping a UTF-8 BOM if present
 * and dropping rows that are entirely empty (common in exports with trailing
 * blank lines). Column order/names are preserved as-is since the AI layer,
 * not this parser, is responsible for interpreting arbitrary headers.
 */
export function parseCsv(csvText: string): ParsedCsv {
  const withoutBom = csvText.replace(/^﻿/, "");

  const parsed = Papa.parse<Record<string, string>>(withoutBom, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  });

  if (parsed.errors.length > 0) {
    const fatal = parsed.errors.filter((e) => e.type !== "FieldMismatch");
    if (fatal.length > 0) {
      throw new CsvParseError(
        `Failed to parse CSV: ${fatal.map((e) => e.message).join("; ")}`
      );
    }
  }

  const headers = (parsed.meta.fields ?? []).filter((h) => h.length > 0);
  if (headers.length === 0) {
    throw new CsvParseError("CSV has no recognizable header row.");
  }

  const rows = parsed.data.filter((row) =>
    Object.values(row).some((v) => v !== undefined && v !== null && String(v).trim() !== "")
  );

  if (rows.length === 0) {
    throw new CsvParseError("CSV has a header row but no data rows.");
  }

  return { headers, rows };
}

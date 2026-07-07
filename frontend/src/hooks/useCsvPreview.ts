"use client";

import Papa from "papaparse";
import { useCallback, useState } from "react";

export interface CsvPreview {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  fileSizeBytes: number;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function useCsvPreview() {
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const parseFile = useCallback((file: File) => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Only .csv files are supported.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("File exceeds the 5MB upload limit.");
      return;
    }
    if (file.size === 0) {
      setError("This file is empty.");
      return;
    }

    setIsParsing(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        setIsParsing(false);
        const headers = (results.meta.fields ?? []).filter((h) => h.length > 0);
        if (headers.length === 0) {
          setError("Couldn't find a header row in this CSV.");
          return;
        }
        const rows = results.data.filter((row) =>
          Object.values(row).some((v) => String(v ?? "").trim() !== "")
        );
        if (rows.length === 0) {
          setError("This CSV has a header row but no data rows.");
          return;
        }
        setPreview({ headers, rows, fileName: file.name, fileSizeBytes: file.size });
      },
      error: (err) => {
        setIsParsing(false);
        setError(`Failed to parse CSV: ${err.message}`);
      },
    });
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setError(null);
  }, []);

  return { preview, error, isParsing, parseFile, reset };
}

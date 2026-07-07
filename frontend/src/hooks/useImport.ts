"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError, importCsv } from "@/lib/api";
import type { ImportResult } from "@/lib/types";

export type ImportStage = "idle" | "processing" | "done" | "error";

export interface ImportState {
  stage: ImportStage;
  processed: number;
  total: number;
  imported: number;
  skipped: number;
  result: ImportResult | null;
  errorMessage: string | null;
}

const initialState: ImportState = {
  stage: "idle",
  processed: 0,
  total: 0,
  imported: 0,
  skipped: 0,
  result: null,
  errorMessage: null,
};

export function useImport() {
  const [state, setState] = useState<ImportState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...initialState, stage: "processing" });

    try {
      await importCsv(
        file,
        (event) => {
          if (event.type === "progress") {
            setState((prev) => ({
              ...prev,
              processed: event.processed,
              total: event.total,
              imported: event.imported,
              skipped: event.skipped,
            }));
          } else if (event.type === "result") {
            setState((prev) => ({ ...prev, stage: "done", result: event.result }));
          } else if (event.type === "error") {
            setState((prev) => ({ ...prev, stage: "error", errorMessage: event.message }));
          }
        },
        controller.signal
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof ApiError ? err.message : "Something went wrong during import.";
      setState((prev) => ({ ...prev, stage: "error", errorMessage: message }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return { state, start, reset };
}

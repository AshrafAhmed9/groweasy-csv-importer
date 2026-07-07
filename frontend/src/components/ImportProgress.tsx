"use client";

import { Loader2 } from "lucide-react";

interface ImportProgressProps {
  processed: number;
  total: number;
  imported: number;
  skipped: number;
}

export function ImportProgress({ processed, total, imported, skipped }: ImportProgressProps) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-8">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-brand" />
        <div>
          <p className="font-semibold text-foreground">AI is mapping your leads…</p>
          <p className="text-sm text-foreground-muted">
            Processing row {processed} of {total || "…"}
          </p>
        </div>
      </div>

      <div className="mt-5 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-brand transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-4 flex gap-6 text-sm">
        <span className="text-foreground-muted">
          Progress: <strong className="text-foreground">{pct}%</strong>
        </span>
        <span className="text-success">
          Imported: <strong>{imported}</strong>
        </span>
        <span className="text-warning">
          Skipped: <strong>{skipped}</strong>
        </span>
      </div>
    </div>
  );
}

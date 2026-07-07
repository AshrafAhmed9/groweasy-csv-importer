"use client";

import { AlertTriangle, CheckCircle2, Database, Download, ListChecks } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "./DataTable";
import { StatCard } from "./StatCard";
import { downloadCsv } from "@/lib/csv";
import { CRM_FIELD_LABELS, CRM_FIELD_ORDER, type CrmRecord, type ImportResult, type SkippedRecord } from "@/lib/types";

const SKIP_REASON_LABELS: Record<SkippedRecord["reason"], string> = {
  missing_contact_info: "No email or mobile number",
  ai_processing_failed: "AI extraction failed",
  malformed_row: "Row missing from AI response",
};

function StatusPill({ status }: { status: string }) {
  if (!status) return <span className="text-foreground-muted">—</span>;
  const toneMap: Record<string, string> = {
    GOOD_LEAD_FOLLOW_UP: "bg-info-bg text-info",
    DID_NOT_CONNECT: "bg-warning-bg text-warning",
    BAD_LEAD: "bg-danger-bg text-danger",
    SALE_DONE: "bg-success-bg text-success",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${toneMap[status] ?? "bg-surface-muted text-foreground-muted"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function ResultsView({ result, sourceFileName }: { result: ImportResult; sourceFileName: string }) {
  const [tab, setTab] = useState<"imported" | "skipped" | "mappings">("imported");

  const importedColumns: DataTableColumn<CrmRecord>[] = useMemo(
    () =>
      CRM_FIELD_ORDER.map((field) => ({
        key: field,
        label: CRM_FIELD_LABELS[field],
        width: field === "crm_note" || field === "description" ? 260 : field === "email" ? 220 : 150,
        render: field === "crm_status" ? (row) => <StatusPill status={row.crm_status} /> : undefined,
      })),
    []
  );

  const skippedColumns: DataTableColumn<SkippedRecord>[] = useMemo(
    () => [
      { key: "rowIndex", label: "Row #", width: 80 },
      { key: "reason", label: "Reason", width: 220, render: (row) => SKIP_REASON_LABELS[row.reason] },
      {
        key: "rawData",
        label: "Original Row Data",
        width: 480,
        render: (row) => (
          <span className="font-mono text-xs text-foreground-muted">
            {JSON.stringify(row.rawData)}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Rows" value={result.totals.totalRows} icon={<Database className="h-5 w-5" />} />
        <StatCard label="Imported" value={result.totals.totalImported} tone="success" icon={<CheckCircle2 className="h-5 w-5" />} />
        <StatCard label="Skipped" value={result.totals.totalSkipped} tone="warning" icon={<AlertTriangle className="h-5 w-5" />} />
        <StatCard label="Mapped Columns" value={result.columnMappings.length} icon={<ListChecks className="h-5 w-5" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-surface-muted p-1">
          {(
            [
              ["imported", `Imported (${result.imported.length})`],
              ["skipped", `Skipped (${result.skipped.length})`],
              ["mappings", "Column Mapping"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === key ? "bg-surface text-foreground shadow-sm" : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {result.imported.length > 0 && (
          <button
            onClick={() => downloadCsv(result.imported, `${sourceFileName.replace(/\.csv$/i, "")}_groweasy_crm.csv`)}
            className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-hover"
          >
            <Download className="h-4 w-4" />
            Download imported CSV
          </button>
        )}
      </div>

      {tab === "imported" && (
        <DataTable
          columns={importedColumns}
          rows={result.imported}
          getRowKey={(row, i) => `${row.email}-${row.mobile_without_country_code}-${i}`}
          maxHeightClassName="max-h-[32rem]"
          emptyMessage="No records were successfully imported from this file."
        />
      )}
      {tab === "skipped" && (
        <DataTable
          columns={skippedColumns}
          rows={result.skipped}
          getRowKey={(row) => row.rowIndex}
          maxHeightClassName="max-h-[32rem]"
          emptyMessage="Nothing was skipped — every row had usable contact info."
        />
      )}
      {tab === "mappings" && (
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-3 text-sm text-foreground-muted">
            How the AI interpreted your source columns — transparency into the mapping decisions.
          </p>
          <div className="flex flex-wrap gap-2">
            {result.columnMappings.map((m) => (
              <div key={m.sourceColumn} className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
                <span className="font-medium text-foreground">{m.sourceColumn}</span>
                <span className="text-foreground-muted">→</span>
                <span className={m.mappedField === "unmapped" ? "text-foreground-muted italic" : "text-accent"}>
                  {m.mappedField === "unmapped" ? "unmapped" : CRM_FIELD_LABELS[m.mappedField]}
                </span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                    m.confidence === "high"
                      ? "bg-success-bg text-success"
                      : m.confidence === "medium"
                        ? "bg-warning-bg text-warning"
                        : "bg-danger-bg text-danger"
                  }`}
                >
                  {m.confidence}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

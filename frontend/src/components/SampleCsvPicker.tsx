"use client";

import { FileText } from "lucide-react";

const SAMPLES = [
  { file: "facebook_leads.csv", label: "Facebook Lead Export" },
  { file: "google_ads_export.csv", label: "Google Ads Export" },
  { file: "real_estate_crm.csv", label: "Real Estate CRM" },
  { file: "sales_report_messy.csv", label: "Messy Sales Report" },
  { file: "manual_sheet.csv", label: "Manual Spreadsheet" },
];

export function SampleCsvPicker({ onPick, disabled }: { onPick: (file: File) => void; disabled?: boolean }) {
  async function handlePick(name: string) {
    const res = await fetch(`/samples/${name}`);
    const blob = await res.blob();
    onPick(new File([blob], name, { type: "text/csv" }));
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-xs text-foreground-muted">Or try a sample:</span>
      {SAMPLES.map((s) => (
        <button
          key={s.file}
          type="button"
          disabled={disabled}
          onClick={() => handlePick(s.file)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileText className="h-3 w-3" />
          {s.label}
        </button>
      ))}
    </div>
  );
}

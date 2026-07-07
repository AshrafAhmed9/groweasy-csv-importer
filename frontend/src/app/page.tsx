"use client";

import { ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { BackendStatusBanner, BackendStatusDot, useBackendStatus } from "@/components/BackendStatus";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { FileDropzone } from "@/components/FileDropzone";
import { ImportProgress } from "@/components/ImportProgress";
import { ResultsView } from "@/components/ResultsView";
import { SampleCsvPicker } from "@/components/SampleCsvPicker";
import { Stepper } from "@/components/Stepper";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useCsvPreview } from "@/hooks/useCsvPreview";
import { useImport } from "@/hooks/useImport";

export default function Home() {
  const { preview, error: previewError, parseFile, reset: resetPreview } = useCsvPreview();
  const { state: importState, start: startImport, reset: resetImport } = useImport();
  const backendStatus = useBackendStatus();
  const pickedFileRef = useRef<File | null>(null);

  const currentStep = importState.stage === "done" ? 4 : importState.stage === "processing" ? 3 : preview ? 2 : 1;

  const previewColumns: DataTableColumn<Record<string, string>>[] = useMemo(
    () => (preview ? preview.headers.map((h) => ({ key: h, label: h, width: 160 })) : []),
    [preview]
  );

  function handleFileSelected(file: File) {
    pickedFileRef.current = file;
    resetImport();
    parseFile(file);
  }

  function handleConfirm() {
    if (!pickedFileRef.current) return;
    toast.info("Sending rows to the AI for mapping…");
    startImport(pickedFileRef.current);
  }

  function handleStartOver() {
    pickedFileRef.current = null;
    resetPreview();
    resetImport();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight text-foreground">GrowEasy CSV Importer</p>
            <p className="text-xs leading-tight text-foreground-muted">AI-powered lead mapping</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <BackendStatusDot status={backendStatus} />
          <ThemeToggle />
        </div>
      </header>

      <BackendStatusBanner status={backendStatus} />

      <Stepper currentStep={currentStep} />

      <main className="flex-1">
        {currentStep === 1 && (
          <UploadStep onFileSelected={handleFileSelected} error={previewError} disabled={backendStatus === "offline"} />
        )}

        {currentStep === 2 && preview && (
          <PreviewStep
            fileName={preview.fileName}
            fileSizeBytes={preview.fileSizeBytes}
            rowCount={preview.rows.length}
            columns={previewColumns}
            rows={preview.rows}
            onBack={handleStartOver}
            onConfirm={handleConfirm}
          />
        )}

        {currentStep === 3 && (
          <ImportProgress
            processed={importState.processed}
            total={importState.total || preview?.rows.length || 0}
            imported={importState.imported}
            skipped={importState.skipped}
          />
        )}

        {currentStep === 4 && importState.result && preview && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Import Complete</h2>
              <button
                onClick={handleStartOver}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4" />
                Import another file
              </button>
            </div>
            <ResultsView result={importState.result} sourceFileName={preview.fileName} />
          </div>
        )}

        {importState.stage === "error" && (
          <ImportErrorState message={importState.errorMessage} onRetry={handleStartOver} />
        )}
      </main>
    </div>
  );
}

function UploadStep({
  onFileSelected,
  error,
  disabled,
}: {
  onFileSelected: (file: File) => void;
  error: string | null;
  disabled: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Import leads from any CSV format</h1>
        <p className="mt-2 text-foreground-muted">
          Facebook exports, Google Ads, real-estate CRMs, manual spreadsheets — our AI maps whatever columns you have.
        </p>
      </div>
      <FileDropzone onFileSelected={onFileSelected} disabled={disabled} />
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger-bg px-4 py-2.5 text-center text-sm text-danger">{error}</p>
      )}
      <SampleCsvPicker onPick={onFileSelected} disabled={disabled} />
    </div>
  );
}

function PreviewStep({
  fileName,
  fileSizeBytes,
  rowCount,
  columns,
  rows,
  onBack,
  onConfirm,
}: {
  fileName: string;
  fileSizeBytes: number;
  rowCount: number;
  columns: DataTableColumn<Record<string, string>>[];
  rows: Record<string, string>[];
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">{fileName}</p>
          <p className="text-xs text-foreground-muted">
            {(fileSizeBytes / 1024).toFixed(1)} KB · {rowCount} row{rowCount === 1 ? "" : "s"} · {columns.length} column
            {columns.length === 1 ? "" : "s"} detected
          </p>
        </div>
        <span className="rounded-full bg-info-bg px-3 py-1 text-xs font-medium text-info">No AI processing yet</span>
      </div>

      <DataTable columns={columns} rows={rows} getRowKey={(_row, i) => i} maxHeightClassName="max-h-[26rem]" />

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Choose a different file
        </button>
        <button
          onClick={onConfirm}
          className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand-hover"
        >
          <Sparkles className="h-4 w-4" />
          Confirm & Import with AI
        </button>
      </div>
    </div>
  );
}

function ImportErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-danger/30 bg-danger-bg p-8 text-center">
      <p className="font-semibold text-danger">Import failed</p>
      <p className="mt-2 text-sm text-danger/90">{message ?? "Something went wrong. Please try again."}</p>
      <button
        onClick={onRetry}
        className="mt-5 rounded-lg border border-danger/40 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
      >
        Try again
      </button>
    </div>
  );
}

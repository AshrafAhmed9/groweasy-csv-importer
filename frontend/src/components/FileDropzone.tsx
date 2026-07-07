"use client";

import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFileSelected, disabled }: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      aria-disabled={disabled}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors ${
        disabled
          ? "cursor-not-allowed border-border bg-surface-muted opacity-60"
          : isDragging
            ? "cursor-pointer border-brand bg-brand/5"
            : "cursor-pointer border-border bg-surface hover:border-brand/60 hover:bg-surface-muted"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
        {isDragging ? <FileSpreadsheet className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">
          {isDragging ? "Drop your CSV here" : "Drag & drop your CSV file"}
        </p>
        <p className="mt-1 text-sm text-foreground-muted">or click to browse — any layout, up to 5MB</p>
      </div>
    </div>
  );
}

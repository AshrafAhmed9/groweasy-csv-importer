"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  width?: number;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T, index: number) => string | number;
  maxHeightClassName?: string;
  emptyMessage?: string;
  rowClassName?: (row: T) => string;
}

const ROW_HEIGHT = 44;
const DEFAULT_COL_WIDTH = 180;
const VIRTUALIZE_THRESHOLD = 60;

/**
 * Reusable table built on CSS Grid (not a real <table>) so header and
 * virtualized body rows always share identical column widths — a real
 * <table> can't be virtualized without each row losing alignment with the
 * header. Sticky header, independent horizontal + vertical scroll, and row
 * virtualization above VIRTUALIZE_THRESHOLD rows keep large CSV previews
 * (thousands of rows) smooth.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  maxHeightClassName = "max-h-[28rem]",
  emptyMessage = "No rows to display.",
  rowClassName,
}: DataTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = rows.length > VIRTUALIZE_THRESHOLD;

  const gridTemplateColumns = useMemo(
    () => columns.map((c) => `minmax(${c.width ?? DEFAULT_COL_WIDTH}px, 1fr)`).join(" "),
    [columns]
  );

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
    enabled: shouldVirtualize,
  });

  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-foreground-muted">
        {emptyMessage}
      </div>
    );
  }

  const renderRow = (row: T, index: number, extraStyle?: React.CSSProperties) => (
    <div
      key={getRowKey(row, index)}
      role="row"
      style={{ gridTemplateColumns, minHeight: ROW_HEIGHT, ...extraStyle }}
      className={`grid items-center border-b border-border last:border-b-0 hover:bg-surface-muted ${rowClassName?.(row) ?? ""}`}
    >
      {columns.map((col) => (
        <div key={col.key} role="cell" className="truncate px-4 py-2.5 text-sm text-foreground">
          {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
        </div>
      ))}
    </div>
  );

  return (
    <div
      ref={scrollRef}
      role="table"
      className={`scrollbar-thin overflow-auto rounded-lg border border-border ${maxHeightClassName}`}
    >
      <div
        role="row"
        style={{ gridTemplateColumns }}
        className="sticky top-0 z-10 grid border-b border-border bg-surface-muted"
      >
        {columns.map((col) => (
          <div
            key={col.key}
            role="columnheader"
            className="truncate px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-foreground-muted"
          >
            {col.label}
          </div>
        ))}
      </div>

      {shouldVirtualize ? (
        <div style={{ position: "relative", height: virtualizer.getTotalSize() }}>
          {virtualizer.getVirtualItems().map((virtualRow) =>
            renderRow(rows[virtualRow.index], virtualRow.index, {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${virtualRow.start}px)`,
            })
          )}
        </div>
      ) : (
        rows.map((row, index) => renderRow(row, index))
      )}
    </div>
  );
}

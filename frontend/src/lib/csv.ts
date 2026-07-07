import Papa from "papaparse";
import { CRM_FIELD_ORDER, type CrmRecord } from "./types";

export function downloadCsv(records: CrmRecord[], filename: string): void {
  const csv = Papa.unparse({
    fields: CRM_FIELD_ORDER,
    data: records.map((r) => CRM_FIELD_ORDER.map((field) => r[field])),
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

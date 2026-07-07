export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

/** A single CRM lead record in GrowEasy's target format. */
export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
  possession_time: string;
  description: string;
}

/** Raw extraction output from the AI, before deterministic post-validation. */
export type RawAiRecord = Partial<CrmRecord> & { rowIndex: number };

export type SkipReason =
  | "missing_contact_info"
  | "ai_processing_failed"
  | "malformed_row";

export interface SkippedRecord {
  rowIndex: number;
  rawData: Record<string, string>;
  reason: SkipReason;
  detail?: string;
}

export interface ColumnMapping {
  sourceColumn: string;
  mappedField: keyof CrmRecord | "unmapped";
  confidence: "high" | "medium" | "low";
}

export interface ImportResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  columnMappings: ColumnMapping[];
  totals: {
    totalRows: number;
    totalImported: number;
    totalSkipped: number;
  };
}

/** SSE event payloads streamed to the client during processing. */
export type ImportProgressEvent = {
  type: "progress";
  processed: number;
  total: number;
  imported: number;
  skipped: number;
};

export type ImportResultEvent = {
  type: "result";
  result: ImportResult;
};

export type ImportErrorEvent = {
  type: "error";
  message: string;
};

export type ImportSseEvent =
  | ImportProgressEvent
  | ImportResultEvent
  | ImportErrorEvent;

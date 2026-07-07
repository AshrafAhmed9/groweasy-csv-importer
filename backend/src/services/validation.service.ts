import {
  CRM_STATUS_VALUES,
  DATA_SOURCE_VALUES,
  type CrmRecord,
  type RawAiRecord,
  type SkippedRecord,
} from "../types/crm.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Escapes literal newlines so every field stays a valid single CSV cell. */
function escapeNewlines(value: string): string {
  return value.replace(/\r\n|\r|\n/g, "\\n");
}

function cleanString(value: unknown): string {
  if (value === null || value === undefined) return "";
  return escapeNewlines(String(value).trim());
}

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value);
}

function isValidMobile(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 15;
}

function normalizeMobile(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizeDate(value: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 19).replace("T", " ");
}

function normalizeCountryCode(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (!digits) return "";
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function normalizeEnum<T extends string>(value: string, allowed: readonly T[]): T | "" {
  const match = allowed.find((v) => v.toLowerCase() === value.trim().toLowerCase());
  return match ?? "";
}

export type ValidationOutcome =
  | { skipped: false; record: CrmRecord }
  | { skipped: true; skip: SkippedRecord };

/**
 * Deterministically re-validates and normalizes every field the AI returned.
 * The LLM is treated as untrusted input: enums are coerced to the allowed
 * set (or blanked), dates must survive `new Date()`, contact info is
 * verified with regex, and the mandatory skip rule (no email AND no mobile)
 * is enforced here rather than relying on the model to have applied it.
 */
export function validateAndNormalize(
  raw: RawAiRecord,
  rawRowData: Record<string, string>
): ValidationOutcome {
  const email = cleanString(raw.email);
  const mobile = cleanString(raw.mobile_without_country_code);

  const validEmail = isValidEmail(email) ? email : "";
  const validMobileDigits = isValidMobile(mobile) ? normalizeMobile(mobile) : "";

  if (!validEmail && !validMobileDigits) {
    return {
      skipped: true,
      skip: {
        rowIndex: raw.rowIndex,
        rawData: rawRowData,
        reason: "missing_contact_info",
        detail: "Row has neither a valid email nor a valid mobile number.",
      },
    };
  }

  const record: CrmRecord = {
    created_at: normalizeDate(cleanString(raw.created_at)),
    name: cleanString(raw.name),
    email: validEmail,
    country_code: validMobileDigits ? normalizeCountryCode(cleanString(raw.country_code)) : "",
    mobile_without_country_code: validMobileDigits,
    company: cleanString(raw.company),
    city: cleanString(raw.city),
    state: cleanString(raw.state),
    country: cleanString(raw.country),
    lead_owner: cleanString(raw.lead_owner),
    crm_status: normalizeEnum(cleanString(raw.crm_status), CRM_STATUS_VALUES),
    crm_note: cleanString(raw.crm_note),
    data_source: normalizeEnum(cleanString(raw.data_source), DATA_SOURCE_VALUES),
    possession_time: cleanString(raw.possession_time),
    description: cleanString(raw.description),
  };

  return { skipped: false, record };
}

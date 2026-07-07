import { describe, expect, it } from "vitest";
import { validateAndNormalize } from "./validation.service.js";
import type { RawAiRecord } from "../types/crm.js";

const baseRaw: RawAiRecord = {
  rowIndex: 0,
  name: "Jane Doe",
  email: "jane@example.com",
  mobile_without_country_code: "9876543210",
  country_code: "+91",
  crm_status: "GOOD_LEAD_FOLLOW_UP",
  data_source: "eden_park",
  created_at: "2026-05-13 14:20:48",
};

const rawRow = { any: "raw data" };

describe("validateAndNormalize", () => {
  it("accepts a well-formed record with both email and mobile", () => {
    const result = validateAndNormalize(baseRaw, rawRow);
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.record.email).toBe("jane@example.com");
      expect(result.record.mobile_without_country_code).toBe("9876543210");
      expect(result.record.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
      expect(result.record.data_source).toBe("eden_park");
    }
  });

  it("skips a row with neither valid email nor valid mobile", () => {
    const result = validateAndNormalize(
      { rowIndex: 1, name: "No Contact" },
      rawRow
    );
    expect(result.skipped).toBe(true);
    if (result.skipped) {
      expect(result.skip.reason).toBe("missing_contact_info");
      expect(result.skip.rowIndex).toBe(1);
    }
  });

  it("keeps a record with only a valid email and no mobile", () => {
    const result = validateAndNormalize(
      { rowIndex: 2, email: "only@example.com" },
      rawRow
    );
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.record.email).toBe("only@example.com");
      expect(result.record.mobile_without_country_code).toBe("");
      expect(result.record.country_code).toBe("");
    }
  });

  it("keeps a record with only a valid mobile and no email", () => {
    const result = validateAndNormalize(
      { rowIndex: 3, mobile_without_country_code: "9123456780", country_code: "91" },
      rawRow
    );
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.record.mobile_without_country_code).toBe("9123456780");
      expect(result.record.country_code).toBe("+91");
      expect(result.record.email).toBe("");
    }
  });

  it("rejects malformed emails", () => {
    const result = validateAndNormalize(
      { rowIndex: 4, email: "not-an-email" },
      rawRow
    );
    expect(result.skipped).toBe(true);
  });

  it("blanks an out-of-enum crm_status instead of passing it through", () => {
    const result = validateAndNormalize(
      { ...baseRaw, rowIndex: 5, crm_status: "SUPER_HOT_LEAD" as never },
      rawRow
    );
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.record.crm_status).toBe("");
    }
  });

  it("blanks an out-of-enum data_source instead of passing it through", () => {
    const result = validateAndNormalize(
      { ...baseRaw, rowIndex: 6, data_source: "random_project" as never },
      rawRow
    );
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.record.data_source).toBe("");
    }
  });

  it("normalizes a parseable date and blanks an unparseable one", () => {
    const good = validateAndNormalize({ ...baseRaw, rowIndex: 7 }, rawRow);
    expect(good.skipped).toBe(false);
    if (!good.skipped) {
      expect(new Date(good.record.created_at).getTime()).not.toBeNaN();
    }

    const bad = validateAndNormalize(
      { ...baseRaw, rowIndex: 8, created_at: "not a date" },
      rawRow
    );
    expect(bad.skipped).toBe(false);
    if (!bad.skipped) {
      expect(bad.record.created_at).toBe("");
    }
  });

  it("escapes literal newlines in free-text fields", () => {
    const result = validateAndNormalize(
      { ...baseRaw, rowIndex: 9, crm_note: "line one\nline two" },
      rawRow
    );
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.record.crm_note).toBe("line one\\nline two");
      expect(result.record.crm_note).not.toContain("\n");
    }
  });

  it("strips non-digit characters from the mobile number", () => {
    const result = validateAndNormalize(
      { ...baseRaw, rowIndex: 10, mobile_without_country_code: "98765-43210" },
      rawRow
    );
    expect(result.skipped).toBe(false);
    if (!result.skipped) {
      expect(result.record.mobile_without_country_code).toBe("9876543210");
    }
  });
});

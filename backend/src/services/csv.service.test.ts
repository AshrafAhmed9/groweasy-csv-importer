import { describe, expect, it } from "vitest";
import { CsvParseError, parseCsv } from "./csv.service.js";

describe("parseCsv", () => {
  it("parses a well-formed CSV into headers and rows", () => {
    const csv = "name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["name", "email"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  it("strips a UTF-8 BOM from the start of the file", () => {
    const csv = "﻿name,email\nJohn,john@example.com";
    const result = parseCsv(csv);
    expect(result.headers[0]).toBe("name");
  });

  it("trims whitespace from headers and values", () => {
    const csv = " name , email \n John Doe , john@example.com ";
    const result = parseCsv(csv);
    expect(result.headers).toEqual(["name", "email"]);
    expect(result.rows[0].name).toBe("John Doe");
  });

  it("handles quoted fields containing commas and newlines", () => {
    const csv =
      'name,note\n"Doe, John","Multi\nline note"';
    const result = parseCsv(csv);
    expect(result.rows[0].name).toBe("Doe, John");
    expect(result.rows[0].note).toContain("Multi");
  });

  it("drops fully empty rows (e.g. trailing blank lines)", () => {
    const csv = "name,email\nJohn,john@example.com\n\n\n";
    const result = parseCsv(csv);
    expect(result.rows).toHaveLength(1);
  });

  it("throws CsvParseError when there is no header row", () => {
    expect(() => parseCsv("")).toThrow(CsvParseError);
  });

  it("throws CsvParseError when there is a header but no data rows", () => {
    expect(() => parseCsv("name,email\n")).toThrow(CsvParseError);
  });
});

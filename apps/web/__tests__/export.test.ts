import { describe, expect, test } from "bun:test";
import { buildCsvContent } from "@/lib/export";

describe("buildCsvContent", () => {
  test("returns empty string for empty rows", () => {
    expect(buildCsvContent([])).toBe("");
  });

  test("generates header row from object keys", () => {
    const result = buildCsvContent([{ Name: "Alice", Email: "alice@example.com" }]);
    const [header] = result.split("\r\n");
    expect(header).toBe("Name,Email");
  });

  test("generates a data row", () => {
    const result = buildCsvContent([{ Name: "Alice", Email: "alice@example.com" }]);
    const [, dataRow] = result.split("\r\n");
    expect(dataRow).toBe("Alice,alice@example.com");
  });

  test("separates lines with CRLF", () => {
    const result = buildCsvContent([{ Name: "Alice" }, { Name: "Bob" }]);
    expect(result).toContain("\r\n");
    expect(result.split("\r\n")).toHaveLength(3); // header + 2 rows
  });

  test("quotes values containing commas", () => {
    const result = buildCsvContent([{ Projects: "Alpha, Beta" }]);
    const [, dataRow] = result.split("\r\n");
    expect(dataRow).toBe('"Alpha, Beta"');
  });

  test("escapes double quotes by doubling them", () => {
    const result = buildCsvContent([{ Note: 'He said "hello"' }]);
    const [, dataRow] = result.split("\r\n");
    expect(dataRow).toBe('"He said ""hello"""');
  });

  test("quotes values containing newlines", () => {
    const result = buildCsvContent([{ Description: "line1\nline2" }]);
    const [, dataRow] = result.split("\r\n");
    expect(dataRow).toBe('"line1\nline2"');
  });

  test("renders null and undefined as empty strings", () => {
    const result = buildCsvContent([{ A: null, B: undefined }]);
    const [, dataRow] = result.split("\r\n");
    expect(dataRow).toBe(",");
  });

  test("handles multiple rows in order", () => {
    const result = buildCsvContent([
      { Name: "Alice", Dept: "Engineering" },
      { Name: "Bob", Dept: "Design" },
    ]);
    const [header, row1, row2] = result.split("\r\n");
    expect(header).toBe("Name,Dept");
    expect(row1).toBe("Alice,Engineering");
    expect(row2).toBe("Bob,Design");
  });

  test("plain values with no special chars are not quoted", () => {
    const result = buildCsvContent([{ Status: "Good" }]);
    const [, dataRow] = result.split("\r\n");
    expect(dataRow).toBe("Good");
  });
});

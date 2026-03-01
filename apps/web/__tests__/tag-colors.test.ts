import { describe, expect, test } from "bun:test";
import { getTagColor } from "@/lib/tag-colors";

describe("getTagColor", () => {
  test("returns a string", () => {
    expect(typeof getTagColor("Engineering")).toBe("string");
  });

  test("returns a valid Tailwind color class string", () => {
    const result = getTagColor("Frontend");
    expect(result).toContain("bg-");
    expect(result).toContain("text-");
    expect(result).toContain("dark:");
  });

  test("is deterministic — same input always returns same color", () => {
    const a = getTagColor("Design");
    const b = getTagColor("Design");
    const c = getTagColor("Design");
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  test("is case-insensitive", () => {
    expect(getTagColor("Frontend")).toBe(getTagColor("frontend"));
    expect(getTagColor("BACKEND")).toBe(getTagColor("backend"));
    expect(getTagColor("DevOps")).toBe(getTagColor("devops"));
  });

  test("returns a color for empty string", () => {
    const result = getTagColor("");
    expect(result).toContain("bg-");
  });

  test("different inputs can produce different colors", () => {
    const colors = new Set(
      ["Engineering", "Design", "Product", "Marketing", "Sales", "Support"].map(getTagColor),
    );
    // With 6 distinct inputs and 10 available colors, we expect at least 2 different colors
    expect(colors.size).toBeGreaterThan(1);
  });

  test("handles special characters", () => {
    const result = getTagColor("C++ / Rust");
    expect(result).toContain("bg-");
  });

  test("handles unicode", () => {
    const result = getTagColor("日本語");
    expect(result).toContain("bg-");
  });
});

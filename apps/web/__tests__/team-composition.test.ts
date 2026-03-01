import { describe, expect, test } from "bun:test";
import { computeComposition } from "@/lib/team-composition";

describe("computeComposition", () => {
  const titleColorMap = new Map([
    ["Software Engineer", "#3b82f6"],
    ["Senior Software Engineer", "#8b5cf6"],
    ["Product Designer", "#10b981"],
  ]);

  test("returns empty array for empty members", () => {
    expect(computeComposition([], titleColorMap)).toEqual([]);
  });

  test("counts members by title", () => {
    const members = [
      { title: { name: "Software Engineer" } },
      { title: { name: "Software Engineer" } },
      { title: { name: "Product Designer" } },
    ];
    const result = computeComposition(members, titleColorMap);
    expect(result).toEqual([
      ["Software Engineer", 2],
      ["Product Designer", 1],
    ]);
  });

  test("groups null titles together", () => {
    const members = [{ title: null }, { title: { name: "Software Engineer" } }, { title: null }];
    const result = computeComposition(members, titleColorMap);
    expect(result).toEqual([
      ["Software Engineer", 1],
      [null, 2],
    ]);
  });

  test("sorts null titles last", () => {
    const members = [{ title: null }, { title: { name: "Product Designer" } }];
    const result = computeComposition(members, titleColorMap);
    const lastEntry = result[result.length - 1];
    expect(lastEntry?.[0]).toBeNull();
  });

  test("sorts by titleColorMap insertion order", () => {
    const members = [
      { title: { name: "Product Designer" } },
      { title: { name: "Software Engineer" } },
      { title: { name: "Senior Software Engineer" } },
    ];
    const result = computeComposition(members, titleColorMap);
    expect(result.map(([name]) => name)).toEqual([
      "Software Engineer",
      "Senior Software Engineer",
      "Product Designer",
    ]);
  });

  test("handles titles not in the color map", () => {
    const members = [{ title: { name: "Unknown Role" } }, { title: { name: "Software Engineer" } }];
    const result = computeComposition(members, titleColorMap);
    // Known titles sort first (by map index), unknown sorts after (indexOf returns -1)
    expect(result).toHaveLength(2);
  });

  test("handles all null titles", () => {
    const members = [{ title: null }, { title: null }];
    const result = computeComposition(members, titleColorMap);
    expect(result).toEqual([[null, 2]]);
  });

  test("single member", () => {
    const members = [{ title: { name: "Software Engineer" } }];
    const result = computeComposition(members, titleColorMap);
    expect(result).toEqual([["Software Engineer", 1]]);
  });
});

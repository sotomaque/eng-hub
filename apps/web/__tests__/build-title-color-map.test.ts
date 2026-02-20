import { describe, expect, test } from "bun:test";
import {
  buildTitleColorMap,
  TITLE_COLOR_PALETTE,
  TITLE_NO_TITLE_COLOR,
} from "@/lib/constants/team";

describe("buildTitleColorMap", () => {
  test("assigns stable colors based on sortOrder, not insertion order", () => {
    const titles = [
      { name: "Manager", sortOrder: 2 },
      { name: "Director", sortOrder: 0 },
      { name: "Engineer", sortOrder: 1 },
    ];

    const map = buildTitleColorMap(titles);

    // Director (0) → first color, Engineer (1) → second, Manager (2) → third
    expect(map.get("Director")).toBe(TITLE_COLOR_PALETTE[0]);
    expect(map.get("Engineer")).toBe(TITLE_COLOR_PALETTE[1]);
    expect(map.get("Manager")).toBe(TITLE_COLOR_PALETTE[2]);
  });

  test("wraps around palette for more titles than colors", () => {
    const titles = Array.from(
      { length: TITLE_COLOR_PALETTE.length + 2 },
      (_, i) => ({
        name: `Title-${i}`,
        sortOrder: i,
      }),
    );

    const map = buildTitleColorMap(titles);

    // Title at palette length should wrap to first color
    expect(map.get(`Title-${TITLE_COLOR_PALETTE.length}`)).toBe(
      TITLE_COLOR_PALETTE[0],
    );
    // Fallback color should never appear when palette has entries
    const values = [...map.values()];
    expect(values.every((v) => v !== TITLE_NO_TITLE_COLOR)).toBe(true);
  });

  test("deduplicates titles keeping last occurrence for sort", () => {
    const titles = [
      { name: "Engineer", sortOrder: 5 },
      { name: "Engineer", sortOrder: 0 },
    ];

    const map = buildTitleColorMap(titles);
    expect(map.size).toBe(1);
    // Map dedupes by name, last wins → sortOrder 0
    expect(map.get("Engineer")).toBe(TITLE_COLOR_PALETTE[0]);
  });
});

import { beforeEach, describe, expect, mock, test } from "bun:test";

const mockMilestoneFindUnique = mock(() =>
  Promise.resolve(null as { parentId: string | null } | null),
);
const mockGoalFindUnique = mock(() => Promise.resolve(null as { parentId: string | null } | null));
const mockProjectFindUnique = mock(() =>
  Promise.resolve(null as { parentId: string | null } | null),
);

mock.module("@workspace/db", () => ({
  db: {
    milestone: { findUnique: mockMilestoneFindUnique },
    quarterlyGoal: { findUnique: mockGoalFindUnique },
    project: { findUnique: mockProjectFindUnique },
  },
}));

const { detectMilestoneCycle, detectGoalCycle, detectProjectCycle } = await import(
  "../roadmap-hierarchy"
);

describe("detectMilestoneCycle", () => {
  beforeEach(() => {
    mockMilestoneFindUnique.mockReset();
  });

  test("returns false for valid parent (no cycle)", async () => {
    // A's new parent B -> C -> null
    mockMilestoneFindUnique
      .mockResolvedValueOnce({ parentId: "C" }) // lookup B
      .mockResolvedValueOnce({ parentId: null }); // lookup C

    const result = await detectMilestoneCycle("A", "B");
    expect(result).toBe(false);
  });

  test("returns true for direct cycle (A→B→A)", async () => {
    // Setting A's parent to B, but B's parent is A
    mockMilestoneFindUnique.mockResolvedValueOnce({ parentId: "A" }); // lookup B

    const result = await detectMilestoneCycle("A", "B");
    expect(result).toBe(true);
  });

  test("returns true for self-reference", async () => {
    const result = await detectMilestoneCycle("A", "A");
    expect(result).toBe(true);
  });

  test("returns true for deep cycle (A→B→C→D→A)", async () => {
    mockMilestoneFindUnique
      .mockResolvedValueOnce({ parentId: "C" }) // lookup B
      .mockResolvedValueOnce({ parentId: "D" }) // lookup C
      .mockResolvedValueOnce({ parentId: "A" }); // lookup D -> cycle!

    const result = await detectMilestoneCycle("A", "B");
    expect(result).toBe(true);
  });

  test("returns false when parent chain ends at null (root)", async () => {
    mockMilestoneFindUnique.mockResolvedValueOnce({ parentId: null });

    const result = await detectMilestoneCycle("A", "B");
    expect(result).toBe(false);
  });

  test("returns false when parent not found in DB", async () => {
    mockMilestoneFindUnique.mockResolvedValueOnce(null);

    const result = await detectMilestoneCycle("A", "B");
    expect(result).toBe(false);
  });

  test("breaks on visited node (pre-existing cycle in data)", async () => {
    // B -> C -> D -> C (cycle in existing data, but doesn't include A)
    mockMilestoneFindUnique
      .mockResolvedValueOnce({ parentId: "C" }) // lookup B
      .mockResolvedValueOnce({ parentId: "D" }) // lookup C
      .mockResolvedValueOnce({ parentId: "C" }); // lookup D -> revisits C

    const result = await detectMilestoneCycle("A", "B");
    expect(result).toBe(false);
  });
});

describe("detectGoalCycle", () => {
  beforeEach(() => {
    mockGoalFindUnique.mockReset();
  });

  test("returns false for valid parent", async () => {
    mockGoalFindUnique.mockResolvedValueOnce({ parentId: null });

    const result = await detectGoalCycle("A", "B");
    expect(result).toBe(false);
  });

  test("returns true for cycle", async () => {
    mockGoalFindUnique.mockResolvedValueOnce({ parentId: "A" });

    const result = await detectGoalCycle("A", "B");
    expect(result).toBe(true);
  });
});

describe("detectProjectCycle", () => {
  beforeEach(() => {
    mockProjectFindUnique.mockReset();
  });

  test("returns false for valid parent", async () => {
    mockProjectFindUnique.mockResolvedValueOnce({ parentId: null });

    const result = await detectProjectCycle("A", "B");
    expect(result).toBe(false);
  });

  test("returns true for cycle", async () => {
    mockProjectFindUnique.mockResolvedValueOnce({ parentId: "A" });

    const result = await detectProjectCycle("A", "B");
    expect(result).toBe(true);
  });
});

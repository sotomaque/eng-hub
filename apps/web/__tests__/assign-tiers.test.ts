import { describe, expect, test } from "bun:test";
import { assignTiers } from "@/lib/tiers";

describe("assignTiers", () => {
  test("distributes 10 contributors into correct tier buckets", () => {
    const stats = Array.from({ length: 10 }, (_, i) => ({
      commits: (10 - i) * 100,
    }));

    const tiers = assignTiers(stats);

    const distribution = { S: 0, A: 0, B: 0, C: 0 };
    for (const tier of tiers.values()) distribution[tier]++;

    // 10% S, 20% A, 30% B, 40% C
    expect(distribution).toEqual({ S: 1, A: 2, B: 3, C: 4 });
  });

  test("ranks by percentile position, not absolute commits", () => {
    // With 2 contributors: position 1/2 = 50% (B), position 2/2 = 100% (C)
    const low = { commits: 1 };
    const high = { commits: 1000 };
    const tiers = assignTiers([low, high]);

    expect(tiers.get(high)).toBe("B");
    expect(tiers.get(low)).toBe("C");
  });

  test("handles empty input without errors", () => {
    const result = assignTiers([]);
    expect(result.size).toBe(0);
  });
});

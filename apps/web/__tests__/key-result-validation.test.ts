import { describe, expect, test } from "bun:test";
import {
  createKeyResultSchema,
  updateKeyResultSchema,
} from "@/lib/validations/key-result";

describe("createKeyResultSchema", () => {
  const validInput = {
    title: "Reduce p99 latency",
    targetValue: 200,
  };

  test("accepts minimal valid input with defaults", () => {
    const result = createKeyResultSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currentValue).toBe(0);
      expect(result.data.status).toBe("NOT_STARTED");
    }
  });

  test("accepts all optional fields", () => {
    const result = createKeyResultSchema.safeParse({
      ...validInput,
      currentValue: 50,
      unit: "ms",
      status: "IN_PROGRESS",
      milestoneId: "ms-1",
      quarterlyGoalId: "qg-1",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty title", () => {
    const result = createKeyResultSchema.safeParse({
      ...validInput,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects zero targetValue", () => {
    const result = createKeyResultSchema.safeParse({
      ...validInput,
      targetValue: 0,
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative targetValue", () => {
    const result = createKeyResultSchema.safeParse({
      ...validInput,
      targetValue: -10,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-numeric targetValue", () => {
    const result = createKeyResultSchema.safeParse({
      ...validInput,
      targetValue: "two hundred",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid status", () => {
    const result = createKeyResultSchema.safeParse({
      ...validInput,
      status: "DONE",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateKeyResultSchema", () => {
  const validUpdate = {
    id: "kr-1",
    title: "Updated KR",
    targetValue: 100,
    currentValue: 75,
    status: "IN_PROGRESS" as const,
  };

  test("accepts valid update", () => {
    const result = updateKeyResultSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  test("allows currentValue of zero", () => {
    const result = updateKeyResultSchema.safeParse({
      ...validUpdate,
      currentValue: 0,
    });
    expect(result.success).toBe(true);
  });

  test("allows negative currentValue", () => {
    const result = updateKeyResultSchema.safeParse({
      ...validUpdate,
      currentValue: -5,
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing id", () => {
    const { id: _, ...noId } = validUpdate;
    const result = updateKeyResultSchema.safeParse(noId);
    expect(result.success).toBe(false);
  });

  test("rejects missing title", () => {
    const { title: _, ...noTitle } = validUpdate;
    const result = updateKeyResultSchema.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  test("requires status (no default on update)", () => {
    const { status: _, ...noStatus } = validUpdate;
    const result = updateKeyResultSchema.safeParse(noStatus);
    expect(result.success).toBe(false);
  });
});

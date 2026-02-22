import { describe, expect, test } from "bun:test";
import {
  createQuarterlyGoalSchema,
  updateQuarterlyGoalSchema,
} from "@/lib/validations/quarterly-goal";

describe("createQuarterlyGoalSchema", () => {
  const validInput = {
    projectId: "proj-1",
    title: "Increase test coverage",
    status: "NOT_STARTED" as const,
  };

  test("accepts minimal valid input", () => {
    const result = createQuarterlyGoalSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test("accepts all optional fields", () => {
    const result = createQuarterlyGoalSchema.safeParse({
      ...validInput,
      description: "Reach 80% coverage",
      quarter: "Q1 2026",
      targetDate: "2026-03-31",
      parentId: "goal-parent",
    });
    expect(result.success).toBe(true);
  });

  test("coerces string targetDate to Date", () => {
    const result = createQuarterlyGoalSchema.safeParse({
      ...validInput,
      targetDate: "2026-06-30",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetDate).toBeInstanceOf(Date);
    }
  });

  test("accepts null targetDate", () => {
    const result = createQuarterlyGoalSchema.safeParse({
      ...validInput,
      targetDate: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.targetDate).toBeNull();
    }
  });

  test("accepts null parentId", () => {
    const result = createQuarterlyGoalSchema.safeParse({
      ...validInput,
      parentId: null,
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty title", () => {
    const result = createQuarterlyGoalSchema.safeParse({
      ...validInput,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing status", () => {
    const result = createQuarterlyGoalSchema.safeParse({
      projectId: "proj-1",
      title: "Goal",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid status", () => {
    const result = createQuarterlyGoalSchema.safeParse({
      ...validInput,
      status: "DONE",
    });
    expect(result.success).toBe(false);
  });

  test("accepts all valid statuses", () => {
    for (const status of [
      "NOT_STARTED",
      "IN_PROGRESS",
      "COMPLETED",
      "AT_RISK",
    ] as const) {
      const result = createQuarterlyGoalSchema.safeParse({
        ...validInput,
        status,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateQuarterlyGoalSchema", () => {
  test("requires id but not projectId", () => {
    const result = updateQuarterlyGoalSchema.safeParse({
      id: "qg-1",
      title: "Updated",
      status: "COMPLETED",
    });
    expect(result.success).toBe(true);
  });

  test("strips projectId from output", () => {
    const result = updateQuarterlyGoalSchema.safeParse({
      id: "qg-1",
      projectId: "proj-1",
      title: "Updated",
      status: "IN_PROGRESS",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("projectId" in result.data).toBe(false);
    }
  });

  test("rejects missing id", () => {
    const result = updateQuarterlyGoalSchema.safeParse({
      title: "Updated",
      status: "COMPLETED",
    });
    expect(result.success).toBe(false);
  });
});

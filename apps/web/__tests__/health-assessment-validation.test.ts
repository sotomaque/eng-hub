import { describe, expect, test } from "bun:test";
import {
  createHealthAssessmentSchema,
  updateHealthAssessmentSchema,
} from "@/lib/validations/health-assessment";

describe("createHealthAssessmentSchema", () => {
  const validInput = {
    projectId: "proj-1",
    overallStatus: "GREEN" as const,
  };

  test("accepts minimal valid input (only required fields)", () => {
    const result = createHealthAssessmentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test("accepts all dimension statuses and notes", () => {
    const result = createHealthAssessmentSchema.safeParse({
      ...validInput,
      overallNotes: { type: "doc", content: [] },
      growthStatus: "YELLOW",
      growthNotes: { type: "doc", content: [] },
      marginStatus: "RED",
      longevityStatus: "GREEN",
      clientSatisfactionStatus: "YELLOW",
      engineeringVibeStatus: "GREEN",
      productVibeStatus: "RED",
      designVibeStatus: "GREEN",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing projectId", () => {
    const result = createHealthAssessmentSchema.safeParse({
      overallStatus: "GREEN",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing overallStatus", () => {
    const result = createHealthAssessmentSchema.safeParse({
      projectId: "proj-1",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid status value", () => {
    const result = createHealthAssessmentSchema.safeParse({
      ...validInput,
      overallStatus: "BLUE",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid dimension status", () => {
    const result = createHealthAssessmentSchema.safeParse({
      ...validInput,
      growthStatus: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  test("accepts all three valid status values", () => {
    for (const status of ["RED", "YELLOW", "GREEN"] as const) {
      const result = createHealthAssessmentSchema.safeParse({
        projectId: "proj-1",
        overallStatus: status,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateHealthAssessmentSchema", () => {
  test("requires id but not projectId", () => {
    const result = updateHealthAssessmentSchema.safeParse({
      id: "ha-1",
      overallStatus: "RED",
    });
    expect(result.success).toBe(true);
  });

  test("strips projectId from output", () => {
    const result = updateHealthAssessmentSchema.safeParse({
      id: "ha-1",
      projectId: "proj-1",
      overallStatus: "GREEN",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("projectId" in result.data).toBe(false);
    }
  });

  test("rejects missing id", () => {
    const result = updateHealthAssessmentSchema.safeParse({
      overallStatus: "GREEN",
    });
    expect(result.success).toBe(false);
  });
});

import { describe, expect, test } from "bun:test";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
} from "@/lib/validations/milestone";

describe("createMilestoneSchema", () => {
  test("accepts valid milestone with date coercion from string", () => {
    const result = createMilestoneSchema.safeParse({
      projectId: "proj-1",
      title: "Launch MVP",
      status: "IN_PROGRESS",
      targetDate: "2026-03-15",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      // z.coerce.date() should convert string to Date
      expect(result.data.targetDate).toBeInstanceOf(Date);
    }
  });

  test("rejects invalid status values", () => {
    const result = createMilestoneSchema.safeParse({
      projectId: "proj-1",
      title: "Launch MVP",
      status: "INVALID_STATUS",
    });

    expect(result.success).toBe(false);
  });

  test("rejects empty title", () => {
    const result = createMilestoneSchema.safeParse({
      projectId: "proj-1",
      title: "",
      status: "NOT_STARTED",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateMilestoneSchema", () => {
  test("requires id but not projectId", () => {
    const withId = updateMilestoneSchema.safeParse({
      id: "ms-1",
      title: "Updated",
      status: "COMPLETED",
    });
    expect(withId.success).toBe(true);

    // projectId should be stripped (omitted from update schema)
    const withProjectId = updateMilestoneSchema.safeParse({
      id: "ms-1",
      projectId: "proj-1",
      title: "Updated",
      status: "COMPLETED",
    });
    // Still succeeds but projectId is not in the output
    expect(withProjectId.success).toBe(true);
    if (withProjectId.success) {
      expect("projectId" in withProjectId.data).toBe(false);
    }
  });
});

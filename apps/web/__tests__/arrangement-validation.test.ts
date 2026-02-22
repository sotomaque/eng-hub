import { describe, expect, test } from "bun:test";
import {
  addArrangementTeamSchema,
  cloneArrangementSchema,
  cloneFromLiveSchema,
  createArrangementSchema,
  updateArrangementSchema,
} from "@/lib/validations/arrangement";

describe("createArrangementSchema", () => {
  test("accepts valid input", () => {
    const result = createArrangementSchema.safeParse({
      projectId: "proj-1",
      name: "Sprint 42",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty name", () => {
    const result = createArrangementSchema.safeParse({
      projectId: "proj-1",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing projectId", () => {
    const result = createArrangementSchema.safeParse({
      name: "Sprint 42",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateArrangementSchema", () => {
  test("accepts valid input", () => {
    const result = updateArrangementSchema.safeParse({
      id: "arr-1",
      name: "Sprint 43",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty name", () => {
    const result = updateArrangementSchema.safeParse({
      id: "arr-1",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing id", () => {
    const result = updateArrangementSchema.safeParse({
      name: "Sprint 43",
    });
    expect(result.success).toBe(false);
  });
});

describe("cloneArrangementSchema", () => {
  test("accepts valid input", () => {
    const result = cloneArrangementSchema.safeParse({
      sourceArrangementId: "arr-1",
      name: "Cloned arrangement",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty name", () => {
    const result = cloneArrangementSchema.safeParse({
      sourceArrangementId: "arr-1",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing sourceArrangementId", () => {
    const result = cloneArrangementSchema.safeParse({
      name: "Cloned",
    });
    expect(result.success).toBe(false);
  });
});

describe("cloneFromLiveSchema", () => {
  test("accepts valid input", () => {
    const result = cloneFromLiveSchema.safeParse({
      projectId: "proj-1",
      name: "From live",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty name", () => {
    const result = cloneFromLiveSchema.safeParse({
      projectId: "proj-1",
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("addArrangementTeamSchema", () => {
  test("accepts valid input", () => {
    const result = addArrangementTeamSchema.safeParse({
      arrangementId: "arr-1",
      name: "Platform",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty team name", () => {
    const result = addArrangementTeamSchema.safeParse({
      arrangementId: "arr-1",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing arrangementId", () => {
    const result = addArrangementTeamSchema.safeParse({
      name: "Platform",
    });
    expect(result.success).toBe(false);
  });
});

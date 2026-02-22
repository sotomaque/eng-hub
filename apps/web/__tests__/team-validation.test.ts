import { describe, expect, test } from "bun:test";
import { createTeamSchema, updateTeamSchema } from "@/lib/validations/team";

describe("createTeamSchema", () => {
  const validInput = {
    projectId: "proj-1",
    name: "Platform",
  };

  test("accepts minimal valid input", () => {
    const result = createTeamSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test("accepts all optional fields", () => {
    const result = createTeamSchema.safeParse({
      ...validInput,
      description: "Handles infrastructure",
      imageUrl: "https://example.com/avatar.png",
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty string for description", () => {
    const result = createTeamSchema.safeParse({
      ...validInput,
      description: "",
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty string for imageUrl", () => {
    const result = createTeamSchema.safeParse({
      ...validInput,
      imageUrl: "",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid imageUrl", () => {
    const result = createTeamSchema.safeParse({
      ...validInput,
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty name", () => {
    const result = createTeamSchema.safeParse({
      ...validInput,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing projectId", () => {
    const result = createTeamSchema.safeParse({
      name: "Platform",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTeamSchema", () => {
  test("requires id but not projectId", () => {
    const result = updateTeamSchema.safeParse({
      id: "team-1",
      name: "Updated Team",
    });
    expect(result.success).toBe(true);
  });

  test("strips projectId from output", () => {
    const result = updateTeamSchema.safeParse({
      id: "team-1",
      projectId: "proj-1",
      name: "Updated Team",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("projectId" in result.data).toBe(false);
    }
  });

  test("rejects missing id", () => {
    const result = updateTeamSchema.safeParse({
      name: "Updated Team",
    });
    expect(result.success).toBe(false);
  });

  test("accepts empty string imageUrl on update", () => {
    const result = updateTeamSchema.safeParse({
      id: "team-1",
      name: "Updated",
      imageUrl: "",
    });
    expect(result.success).toBe(true);
  });
});

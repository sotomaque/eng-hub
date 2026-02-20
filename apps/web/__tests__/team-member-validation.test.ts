import { describe, expect, test } from "bun:test";
import {
  createTeamMemberSchema,
  updateTeamMemberSchema,
} from "@/lib/validations/team-member";

describe("createTeamMemberSchema", () => {
  const validInput = {
    projectId: "proj-1",
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
    departmentId: "dept-1",
  };

  test("accepts minimal valid input", () => {
    const result = createTeamMemberSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test("accepts full valid input with all optional fields", () => {
    const result = createTeamMemberSchema.safeParse({
      ...validInput,
      callsign: "JD",
      titleId: "title-1",
      teamIds: ["team-a", "team-b"],
      githubUsername: "janedoe",
      gitlabUsername: "janedoe",
      imageUrl: "https://example.com/photo.jpg",
      managerId: "mgr-1",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty firstName", () => {
    const result = createTeamMemberSchema.safeParse({
      ...validInput,
      firstName: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty lastName", () => {
    const result = createTeamMemberSchema.safeParse({
      ...validInput,
      lastName: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = createTeamMemberSchema.safeParse({
      ...validInput,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  test("accepts empty string for optional string fields", () => {
    const result = createTeamMemberSchema.safeParse({
      ...validInput,
      callsign: "",
      titleId: "",
      githubUsername: "",
      gitlabUsername: "",
      managerId: "",
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty string for imageUrl (optional)", () => {
    const result = createTeamMemberSchema.safeParse({
      ...validInput,
      imageUrl: "",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid imageUrl (non-empty non-URL)", () => {
    const result = createTeamMemberSchema.safeParse({
      ...validInput,
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("accepts empty teamIds array", () => {
    const result = createTeamMemberSchema.safeParse({
      ...validInput,
      teamIds: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("updateTeamMemberSchema", () => {
  const validUpdate = {
    id: "tm-1",
    firstName: "Jane",
    lastName: "Updated",
    email: "jane@example.com",
    departmentId: "dept-1",
  };

  test("requires id field", () => {
    const { id: _, ...withoutId } = validUpdate;
    const result = updateTeamMemberSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  test("accepts valid update without projectId", () => {
    const result = updateTeamMemberSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  test("omits projectId from output", () => {
    const result = updateTeamMemberSchema.safeParse({
      ...validUpdate,
      projectId: "should-be-stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("projectId" in result.data).toBe(false);
    }
  });
});

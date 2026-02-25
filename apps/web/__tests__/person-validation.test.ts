import { describe, expect, test } from "bun:test";
import { createPersonSchema, updatePersonSchema } from "@/lib/validations/person";

describe("createPersonSchema", () => {
  const validInput = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane.doe@example.com",
  };

  test("accepts minimal valid input", () => {
    const result = createPersonSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test("accepts full valid input with all optional fields", () => {
    const result = createPersonSchema.safeParse({
      ...validInput,
      callsign: "JD",
      githubUsername: "janedoe",
      gitlabUsername: "janedoe",
      imageUrl: "https://example.com/photo.jpg",
      managerId: "mgr-1",
      departmentId: "dept-1",
      titleId: "title-1",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty firstName", () => {
    const result = createPersonSchema.safeParse({
      ...validInput,
      firstName: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty lastName", () => {
    const result = createPersonSchema.safeParse({
      ...validInput,
      lastName: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = createPersonSchema.safeParse({
      ...validInput,
      email: "bad-email",
    });
    expect(result.success).toBe(false);
  });

  test("accepts empty string for all optional string fields", () => {
    const result = createPersonSchema.safeParse({
      ...validInput,
      callsign: "",
      githubUsername: "",
      gitlabUsername: "",
      managerId: "",
      departmentId: "",
      titleId: "",
      imageUrl: "",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid imageUrl (non-empty non-URL)", () => {
    const result = createPersonSchema.safeParse({
      ...validInput,
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("does not require departmentId (optional for person)", () => {
    const result = createPersonSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.departmentId).toBeUndefined();
    }
  });
});

describe("updatePersonSchema", () => {
  const validUpdate = {
    id: "person-1",
    firstName: "Jane",
    lastName: "Updated",
    email: "jane@example.com",
  };

  test("requires id field", () => {
    const { id: _, ...withoutId } = validUpdate;
    const result = updatePersonSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  test("accepts valid update", () => {
    const result = updatePersonSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  test("includes id in output", () => {
    const result = updatePersonSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("person-1");
    }
  });
});

import { describe, expect, test } from "bun:test";
import {
  createProjectSchema,
  updateProjectSchema,
} from "@/lib/validations/project";

describe("createProjectSchema", () => {
  test("accepts minimal valid input (name only)", () => {
    const result = createProjectSchema.safeParse({ name: "My Project" });
    expect(result.success).toBe(true);
  });

  test("accepts full valid input with all optional fields", () => {
    const result = createProjectSchema.safeParse({
      name: "My Project",
      description: "A great project",
      githubUrl: "https://github.com/org/repo",
      gitlabUrl: "https://gitlab.com/org/repo",
      imageUrl: "https://example.com/logo.png",
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty name", () => {
    const result = createProjectSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  test("rejects invalid githubUrl", () => {
    const result = createProjectSchema.safeParse({
      name: "Project",
      githubUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid gitlabUrl", () => {
    const result = createProjectSchema.safeParse({
      name: "Project",
      gitlabUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("accepts empty strings for URL fields", () => {
    const result = createProjectSchema.safeParse({
      name: "Project",
      githubUrl: "",
      gitlabUrl: "",
      imageUrl: "",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid imageUrl (non-empty non-URL)", () => {
    const result = createProjectSchema.safeParse({
      name: "Project",
      imageUrl: "bad",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateProjectSchema", () => {
  test("requires id field", () => {
    const result = updateProjectSchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(false);
  });

  test("accepts valid update with id", () => {
    const result = updateProjectSchema.safeParse({
      id: "proj-1",
      name: "Updated Project",
    });
    expect(result.success).toBe(true);
  });

  test("includes id in output", () => {
    const result = updateProjectSchema.safeParse({
      id: "proj-1",
      name: "Updated",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("proj-1");
    }
  });
});

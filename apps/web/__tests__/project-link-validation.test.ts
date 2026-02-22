import { describe, expect, test } from "bun:test";
import {
  createProjectLinkSchema,
  updateProjectLinkSchema,
} from "@/lib/validations/project-link";

describe("createProjectLinkSchema", () => {
  const validInput = {
    projectId: "proj-1",
    label: "GitHub Repo",
    url: "https://github.com/org/repo",
  };

  test("accepts valid input", () => {
    const result = createProjectLinkSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test("rejects empty label", () => {
    const result = createProjectLinkSchema.safeParse({
      ...validInput,
      label: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid URL", () => {
    const result = createProjectLinkSchema.safeParse({
      ...validInput,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty URL", () => {
    const result = createProjectLinkSchema.safeParse({
      ...validInput,
      url: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing projectId", () => {
    const result = createProjectLinkSchema.safeParse({
      label: "Figma",
      url: "https://figma.com/file/abc",
    });
    expect(result.success).toBe(false);
  });

  test("accepts various valid URL formats", () => {
    for (const url of [
      "https://figma.com/file/abc",
      "https://notion.so/page-123",
      "http://localhost:3000/test",
    ]) {
      const result = createProjectLinkSchema.safeParse({
        ...validInput,
        url,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateProjectLinkSchema", () => {
  test("requires id but not projectId", () => {
    const result = updateProjectLinkSchema.safeParse({
      id: "link-1",
      label: "Updated",
      url: "https://example.com",
    });
    expect(result.success).toBe(true);
  });

  test("strips projectId from output", () => {
    const result = updateProjectLinkSchema.safeParse({
      id: "link-1",
      projectId: "proj-1",
      label: "Updated",
      url: "https://example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("projectId" in result.data).toBe(false);
    }
  });

  test("rejects missing id", () => {
    const result = updateProjectLinkSchema.safeParse({
      label: "Updated",
      url: "https://example.com",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid URL on update", () => {
    const result = updateProjectLinkSchema.safeParse({
      id: "link-1",
      label: "Updated",
      url: "bad-url",
    });
    expect(result.success).toBe(false);
  });
});

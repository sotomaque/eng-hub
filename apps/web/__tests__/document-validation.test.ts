import { describe, expect, test } from "bun:test";
import { createDocumentSchema, updateDocumentSchema } from "@/lib/validations/document";

describe("createDocumentSchema", () => {
  const validInput = {
    title: "Project Spec",
    fileUrl: "https://storage.example.com/docs/spec.pdf",
    fileName: "spec.pdf",
    tags: [],
    projectId: "proj-1",
  };

  test("accepts valid input with projectId", () => {
    const result = createDocumentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test("accepts valid input with personId", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      projectId: undefined,
      personId: "person-1",
    });
    expect(result.success).toBe(true);
  });

  test("accepts optional fields", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      description: "Detailed project specification",
      fileSize: 1024000,
      mimeType: "application/pdf",
      tags: ["spec", "v2"],
    });
    expect(result.success).toBe(true);
  });

  test("rejects empty title", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects title exceeding 200 chars", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      title: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid fileUrl", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      fileUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty fileName", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      fileName: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects description exceeding 2000 chars", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      description: "A".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  test("rejects more than 20 tags", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`),
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty tag strings", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      tags: ["valid", ""],
    });
    expect(result.success).toBe(false);
  });

  test("rejects tag exceeding 50 chars", () => {
    const result = createDocumentSchema.safeParse({
      ...validInput,
      tags: ["A".repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing tags field", () => {
    const { tags: _, ...inputWithoutTags } = validInput;
    const result = createDocumentSchema.safeParse(inputWithoutTags);
    expect(result.success).toBe(false);
  });
});

describe("updateDocumentSchema", () => {
  const validInput = {
    id: "doc-1",
    title: "Updated Spec",
    tags: ["updated"],
  };

  test("accepts valid update input", () => {
    const result = updateDocumentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  test("accepts optional description", () => {
    const result = updateDocumentSchema.safeParse({
      ...validInput,
      description: "Updated description",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing id", () => {
    const { id: _, ...rest } = validInput;
    const result = updateDocumentSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects empty title on update", () => {
    const result = updateDocumentSchema.safeParse({
      ...validInput,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  test("does not require file fields", () => {
    const result = updateDocumentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect("fileUrl" in result.data).toBe(false);
      expect("fileName" in result.data).toBe(false);
    }
  });
});

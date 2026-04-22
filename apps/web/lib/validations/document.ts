import { z } from "zod";

const tagsSchema = z.array(z.string().min(1).max(50)).max(20);

export const createDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  fileUrl: z.string(),
  fileName: z.string().min(1),
  fileSize: z.number().optional(),
  mimeType: z.string().optional(),
  tags: tagsSchema,
  projectId: z.string().optional(),
  personId: z.string().optional(),
});

export const updateDocumentSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  tags: tagsSchema,
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

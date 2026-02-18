import { z } from "zod";

export const createStatusUpdateSchema = z.object({
  projectId: z.string(),
  status: z.enum(["RED", "YELLOW", "GREEN"]),
  description: z.string().optional(),
});

export type CreateStatusUpdateInput = z.infer<typeof createStatusUpdateSchema>;

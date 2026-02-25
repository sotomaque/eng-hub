import { z } from "zod";

export const roadmapStatusEnum = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "AT_RISK"]);

export const createMilestoneSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum,
  parentId: z.string().nullable().optional(),
});

export const updateMilestoneSchema = createMilestoneSchema.omit({ projectId: true }).extend({
  id: z.string(),
});

export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

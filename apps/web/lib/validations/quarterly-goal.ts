import { z } from "zod";

export const roadmapStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "AT_RISK",
]);

export const createQuarterlyGoalSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  quarter: z.string().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  status: roadmapStatusEnum,
  parentId: z.string().nullable().optional(),
});

export const updateQuarterlyGoalSchema = createQuarterlyGoalSchema
  .omit({ projectId: true })
  .extend({
    id: z.string(),
  });

export type CreateQuarterlyGoalInput = z.infer<
  typeof createQuarterlyGoalSchema
>;
export type UpdateQuarterlyGoalInput = z.infer<
  typeof updateQuarterlyGoalSchema
>;

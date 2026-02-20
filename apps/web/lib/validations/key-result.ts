import { z } from "zod";
import { roadmapStatusEnum } from "./milestone";

export const createKeyResultSchema = z.object({
  title: z.string().min(1, "Title is required"),
  targetValue: z.number().positive("Target must be positive"),
  currentValue: z.number().default(0),
  unit: z.string().optional(),
  status: roadmapStatusEnum.default("NOT_STARTED"),
  milestoneId: z.string().optional(),
  quarterlyGoalId: z.string().optional(),
});

export const updateKeyResultSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  targetValue: z.number().positive("Target must be positive"),
  currentValue: z.number(),
  unit: z.string().optional(),
  status: roadmapStatusEnum,
});

export type CreateKeyResultInput = z.infer<typeof createKeyResultSchema>;
export type UpdateKeyResultInput = z.infer<typeof updateKeyResultSchema>;

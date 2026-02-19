import { z } from "zod";

const healthStatusEnum = z.enum(["RED", "YELLOW", "GREEN"]);

export const createHealthAssessmentSchema = z.object({
  projectId: z.string(),
  overallStatus: healthStatusEnum,
  overallNotes: z.any().optional(), // Tiptap JSON — z.any() to avoid TS2589 with tRPC
  growthStatus: healthStatusEnum.optional(),
  growthNotes: z.any().optional(),
  marginStatus: healthStatusEnum.optional(),
  marginNotes: z.any().optional(),
  longevityStatus: healthStatusEnum.optional(),
  longevityNotes: z.any().optional(),
  clientSatisfactionStatus: healthStatusEnum.optional(),
  clientSatisfactionNotes: z.any().optional(),
  engineeringVibeStatus: healthStatusEnum.optional(),
  engineeringVibeNotes: z.any().optional(),
  productVibeStatus: healthStatusEnum.optional(),
  productVibeNotes: z.any().optional(),
  designVibeStatus: healthStatusEnum.optional(),
  designVibeNotes: z.any().optional(),
});

export type CreateHealthAssessmentInput = z.infer<
  typeof createHealthAssessmentSchema
>;

export const updateHealthAssessmentSchema = createHealthAssessmentSchema
  .omit({ projectId: true })
  .extend({ id: z.string() });

export type UpdateHealthAssessmentInput = z.infer<
  typeof updateHealthAssessmentSchema
>;

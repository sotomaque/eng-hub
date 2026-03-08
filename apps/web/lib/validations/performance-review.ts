import { z } from "zod";

const scoreField = z.coerce
  .number()
  .min(1, "Score must be at least 1")
  .max(5, "Score must be at most 5")
  .multipleOf(0.5, "Score must be in 0.5 increments");

export const performanceReviewSchema = z.object({
  cycleLabel: z.string().min(1, "Cycle label is required"),
  reviewDate: z.coerce.date(),
  coreCompetencyScore: scoreField,
  teamworkScore: scoreField,
  innovationScore: scoreField,
  timeManagementScore: scoreField,
  coreCompetencyComments: z.string().optional(),
  teamworkComments: z.string().optional(),
  innovationComments: z.string().optional(),
  timeManagementComments: z.string().optional(),
});

export type PerformanceReviewInput = z.infer<typeof performanceReviewSchema>;

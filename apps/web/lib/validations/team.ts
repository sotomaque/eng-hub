import { z } from "zod";

export const createTeamSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const updateTeamSchema = createTeamSchema
  .omit({ projectId: true })
  .extend({
    id: z.string(),
  });

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

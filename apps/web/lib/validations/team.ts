import { z } from "zod";

export const createTeamSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const updateTeamSchema = createTeamSchema
  .omit({ projectId: true })
  .extend({
    id: z.string(),
  });

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

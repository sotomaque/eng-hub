import { z } from "zod";

export const createTeamMemberSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  role: z.string().min(1, "Role is required"),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
});

export const updateTeamMemberSchema = createTeamMemberSchema
  .omit({ projectId: true })
  .extend({
    id: z.string(),
  });

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

import { z } from "zod";

export const createTeamMemberSchema = z.object({
  projectId: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  callsign: z.string().optional().or(z.literal("")),
  email: z.string().email("Must be a valid email"),
  titleId: z.string().optional().or(z.literal("")),
  departmentId: z.string().min(1, "Department is required"),
  teamIds: z.array(z.string()).optional(),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
});

export const updateTeamMemberSchema = createTeamMemberSchema
  .omit({ projectId: true })
  .extend({
    id: z.string(),
  });

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

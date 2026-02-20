import { z } from "zod";

export const createPersonSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  callsign: z.string().optional().or(z.literal("")),
  email: z.string().email("Must be a valid email"),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  titleId: z.string().optional().or(z.literal("")),
});

export const updatePersonSchema = createPersonSchema.extend({
  id: z.string(),
});

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;

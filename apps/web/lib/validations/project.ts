import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  githubUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  gitlabUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.extend({
  id: z.string(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

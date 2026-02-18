import { z } from "zod";

export const createProjectLinkSchema = z.object({
  projectId: z.string(),
  label: z.string().min(1, "Label is required"),
  url: z.string().url("Must be a valid URL"),
});

export const updateProjectLinkSchema = createProjectLinkSchema
  .omit({ projectId: true })
  .extend({
    id: z.string(),
  });

export type CreateProjectLinkInput = z.infer<typeof createProjectLinkSchema>;
export type UpdateProjectLinkInput = z.infer<typeof updateProjectLinkSchema>;

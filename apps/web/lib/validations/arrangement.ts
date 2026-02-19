import { z } from "zod";

export const createArrangementSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const updateArrangementSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const cloneArrangementSchema = z.object({
  sourceArrangementId: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const cloneFromLiveSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1, "Name is required"),
});

export const addArrangementTeamSchema = z.object({
  arrangementId: z.string(),
  name: z.string().min(1, "Team name is required"),
});

export type CreateArrangementInput = z.infer<typeof createArrangementSchema>;
export type UpdateArrangementInput = z.infer<typeof updateArrangementSchema>;
export type CloneArrangementInput = z.infer<typeof cloneArrangementSchema>;
export type CloneFromLiveInput = z.infer<typeof cloneFromLiveSchema>;
export type AddArrangementTeamInput = z.infer<typeof addArrangementTeamSchema>;

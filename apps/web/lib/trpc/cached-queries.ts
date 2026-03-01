import { cache } from "react";
import { createServerCaller } from "./server";

export const getCachedProject = cache(async (id: string) => {
  const trpc = await createServerCaller();
  return trpc.project.getById({ id });
});

export const getCachedBilletsByProjectId = cache(async (projectId: string) => {
  const trpc = await createServerCaller();
  return trpc.billet.getByProjectId({ projectId });
});

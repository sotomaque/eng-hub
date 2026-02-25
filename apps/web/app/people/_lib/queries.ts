import { cache } from "react";
import { createServerCaller } from "@/lib/trpc/server";

export const getCachedProjectNames = cache(async () => {
  const trpc = await createServerCaller();
  const projects = await trpc.project.listNames();
  return projects.map((p) => p.name); // listNames already sorted by name
});

export const getCachedDepartmentNames = cache(async () => {
  const trpc = await createServerCaller();
  const departments = await trpc.department.getAll();
  return departments.map((d) => d.name).sort();
});

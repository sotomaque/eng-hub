import { cache } from "react";
import { createServerCaller } from "@/lib/trpc/server";

export const getCachedPerson = cache(async (id: string) => {
  const trpc = await createServerCaller();
  return trpc.person.getById({ id });
});

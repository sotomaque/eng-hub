import { cache } from "react";
import { createServerCaller } from "@/lib/trpc/server";

export const getMe = cache(async () => {
  const trpc = await createServerCaller();
  return trpc.person.me();
});

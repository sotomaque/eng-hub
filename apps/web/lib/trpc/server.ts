import {
  appRouter,
  createCallerFactory,
  createTRPCContext,
} from "@workspace/api";

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller() {
  const context = await createTRPCContext();
  return createCaller(context);
}

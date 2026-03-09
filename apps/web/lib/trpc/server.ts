import { TRPCError } from "@trpc/server";
import { appRouter, createCallerFactory, createTRPCContext } from "@workspace/api";
import { redirect } from "next/navigation";

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller() {
  const context = await createTRPCContext();
  const caller = createCaller(context);

  // Wrap with a Proxy that catches UNAUTHORIZED/FORBIDDEN TRPCErrors
  // and redirects to a proper error page instead of crashing.
  return new Proxy(caller, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === "object" && value !== null) {
        return new Proxy(value, {
          get(routerTarget, routerProp, routerReceiver) {
            const procedure = Reflect.get(routerTarget, routerProp, routerReceiver);
            if (typeof procedure !== "function") return procedure;
            return async (...args: unknown[]) => {
              try {
                return await (procedure as (...a: unknown[]) => unknown)(...args);
              } catch (err) {
                if (err instanceof TRPCError) {
                  if (err.code === "UNAUTHORIZED" || err.code === "FORBIDDEN") {
                    redirect("/unauthorized");
                  }
                }
                throw err;
              }
            };
          },
        });
      }
      return value;
    },
  });
}

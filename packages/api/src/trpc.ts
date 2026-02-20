import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { Ratelimit } from "@upstash/ratelimit";
import { ZodError } from "zod";
import { redis } from "./lib/redis";

export const createTRPCContext = async () => {
  const { userId } = await auth();

  return {
    userId,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// ── Auth Middleware ───────────────────────────────────────────

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

// ── Rate Limiting ────────────────────────────────────────────

const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "60 s"),
  prefix: "enghub:rl:general",
});

const mutationLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "60 s"),
  prefix: "enghub:rl:mutation",
});

const rateLimitMiddleware = t.middleware(async ({ ctx, next, type }) => {
  const identifier = ctx.userId ?? "anonymous";
  const limiter = type === "mutation" ? mutationLimiter : generalLimiter;
  const { success, reset } = await limiter.limit(identifier);

  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)}s.`,
    });
  }

  return next();
});

// Strict limiter for expensive operations (e.g. GitHub sync)
const strictLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, "300 s"),
  prefix: "enghub:rl:strict",
});

export async function enforceStrictRateLimit(userId: string): Promise<void> {
  const { success, reset } = await strictLimiter.limit(userId);
  if (!success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)}s.`,
    });
  }
}

export const protectedProcedure = t.procedure
  .use(enforceUserIsAuthed)
  .use(rateLimitMiddleware);

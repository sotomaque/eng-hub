import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import {
  assertAccess,
  assertPersonAccess,
  hasCapability,
  type ResolvedAccess,
  resolveAccess,
} from "./lib/access";
import type { Capability } from "./lib/capabilities";
import { resolveClerkPerson } from "./lib/hierarchy";

// ── Context ──────────────────────────────────────────────────

export const createTRPCContext = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role ?? null;

  // Eagerly resolve personId + ABAC access for the authenticated user
  let personId: string | null = null;
  let access: ResolvedAccess | null = null;

  if (userId) {
    personId = await resolveClerkPerson(userId);
    if (personId) {
      access = await resolveAccess(personId);
    }
  }

  return {
    userId,
    role,
    personId,
    access,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// ── Auth Middleware ───────────────────────────────────────────

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId || !ctx.personId || !ctx.access) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      userId: ctx.userId,
      personId: ctx.personId,
      access: ctx.access,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);

// ── Admin Middleware (ABAC-based) ────────────────────────────

const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.access || !hasCapability(ctx.access, "admin:access")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  }
  return next();
});

export const adminProcedure = protectedProcedure.use(enforceUserIsAdmin);

// ── Capability Middleware Factories ──────────────────────────

/**
 * Require a global capability (or project-scoped if input has projectId).
 */
export function requireCapability(cap: Capability) {
  return t.middleware(({ ctx, next, input }) => {
    if (!ctx.access) throw new TRPCError({ code: "UNAUTHORIZED" });
    const projectId = (input as { projectId?: string } | null)?.projectId;
    assertAccess(ctx.access, cap, projectId);
    return next();
  });
}

/**
 * Require a person-scoped capability (checks hierarchy + self-access).
 */
export function requirePersonCapability(cap: Capability) {
  return t.middleware(async ({ ctx, next, input }) => {
    if (!ctx.access) throw new TRPCError({ code: "UNAUTHORIZED" });
    const targetPersonId = (input as { personId?: string } | null)?.personId;
    if (!targetPersonId) throw new TRPCError({ code: "BAD_REQUEST", message: "personId required" });
    await assertPersonAccess(ctx.access, cap, targetPersonId);
    return next();
  });
}

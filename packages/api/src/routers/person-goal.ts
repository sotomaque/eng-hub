import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { resolveClerkPerson } from "../lib/hierarchy";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const roadmapStatusEnum = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "AT_RISK"]);

export const personGoalRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const personId = await resolveClerkPerson(ctx.userId);
    if (!personId) return [];
    return db.personGoal.findMany({
      where: { personId },
      orderBy: { sortOrder: "asc" },
    });
  }),

  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ input }) => {
      return db.personGoal.findMany({
        where: { personId: input.personId },
        orderBy: { sortOrder: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        status: roadmapStatusEnum.optional(),
        targetDate: z.coerce.date().nullable().optional(),
        quarter: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const personId = await resolveClerkPerson(ctx.userId);
      if (!personId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must claim a Person record first.",
        });
      }
      return db.personGoal.create({
        data: {
          personId,
          title: input.title,
          description: input.description,
          status: input.status ?? "NOT_STARTED",
          targetDate: input.targetDate ?? null,
          quarter: input.quarter,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        status: roadmapStatusEnum,
        targetDate: z.coerce.date().nullable().optional(),
        quarter: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const personId = await resolveClerkPerson(ctx.userId);
      if (!personId) throw new TRPCError({ code: "FORBIDDEN" });

      const goal = await db.personGoal.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!goal || goal.personId !== personId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.personGoal.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          status: input.status,
          targetDate: input.targetDate ?? null,
          quarter: input.quarter,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const personId = await resolveClerkPerson(ctx.userId);
      if (!personId) throw new TRPCError({ code: "FORBIDDEN" });

      const goal = await db.personGoal.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!goal || goal.personId !== personId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.personGoal.delete({ where: { id: input.id } });
    }),

  reorder: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const personId = await resolveClerkPerson(ctx.userId);
      if (!personId) throw new TRPCError({ code: "FORBIDDEN" });

      return db.$transaction(
        input.ids.map((id, index) =>
          db.personGoal.update({
            where: { id, personId },
            data: { sortOrder: index },
          }),
        ),
      );
    }),
});

import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { hasPersonCapability } from "../lib/access";
import { CAPABILITIES } from "../lib/capabilities";
import { createTRPCRouter, protectedProcedure, requirePersonCapability } from "../trpc";

const roadmapStatusEnum = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "AT_RISK"]);

export const personGoalRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db.personGoal.findMany({
      where: { personId: ctx.personId },
      orderBy: { sortOrder: "asc" },
      take: 100,
    });
  }),

  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .use(requirePersonCapability(CAPABILITIES.PERSON_GOALS_READ))
    .query(async ({ input }) => {
      return db.personGoal.findMany({
        where: { personId: input.personId },
        orderBy: { sortOrder: "asc" },
        take: 100,
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
        personId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetPersonId = input.personId ?? ctx.personId;

      if (targetPersonId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_GOALS_WRITE,
          targetPersonId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.personGoal.create({
        data: {
          personId: targetPersonId,
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
      const goal = await db.personGoal.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });

      if (goal.personId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_GOALS_WRITE,
          goal.personId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
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
      const goal = await db.personGoal.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!goal) throw new TRPCError({ code: "NOT_FOUND" });

      if (goal.personId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_GOALS_WRITE,
          goal.personId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.personGoal.delete({ where: { id: input.id } });
    }),

  reorder: protectedProcedure
    .input(z.object({ ids: z.array(z.string()), personId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const targetPersonId = input.personId ?? ctx.personId;

      if (targetPersonId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_GOALS_WRITE,
          targetPersonId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.$transaction(
        input.ids.map((id, index) =>
          db.personGoal.update({
            where: { id, personId: targetPersonId },
            data: { sortOrder: index },
          }),
        ),
      );
    }),
});

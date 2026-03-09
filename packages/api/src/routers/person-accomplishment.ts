import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { hasPersonCapability } from "../lib/access";
import { CAPABILITIES } from "../lib/capabilities";
import { createTRPCRouter, protectedProcedure, requirePersonCapability } from "../trpc";

export const personAccomplishmentRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db.personAccomplishment.findMany({
      where: { personId: ctx.personId },
      orderBy: [{ date: "desc" }, { sortOrder: "asc" }],
      take: 200,
    });
  }),

  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .use(requirePersonCapability(CAPABILITIES.PERSON_GOALS_READ))
    .query(async ({ input }) => {
      return db.personAccomplishment.findMany({
        where: { personId: input.personId },
        orderBy: [{ date: "desc" }, { sortOrder: "asc" }],
        take: 200,
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        date: z.coerce.date().nullable().optional(),
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

      return db.personAccomplishment.create({
        data: {
          personId: targetPersonId,
          title: input.title,
          description: input.description,
          date: input.date ?? null,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        date: z.coerce.date().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const accomplishment = await db.personAccomplishment.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!accomplishment) throw new TRPCError({ code: "NOT_FOUND" });

      if (accomplishment.personId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_GOALS_WRITE,
          accomplishment.personId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.personAccomplishment.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          date: input.date ?? null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const accomplishment = await db.personAccomplishment.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!accomplishment) throw new TRPCError({ code: "NOT_FOUND" });

      if (accomplishment.personId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_GOALS_WRITE,
          accomplishment.personId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.personAccomplishment.delete({ where: { id: input.id } });
    }),
});

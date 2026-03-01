import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { isDirectManager, resolveClerkPerson } from "../lib/hierarchy";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const personAccomplishmentRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const personId = await resolveClerkPerson(ctx.userId);
    if (!personId) return [];
    return db.personAccomplishment.findMany({
      where: { personId },
      orderBy: [{ date: "desc" }, { sortOrder: "asc" }],
      take: 200,
    });
  }),

  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
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
      const myPersonId = await resolveClerkPerson(ctx.userId);
      if (!myPersonId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must claim a Person record first.",
        });
      }

      const targetPersonId = input.personId ?? myPersonId;

      if (targetPersonId !== myPersonId) {
        const isManager = await isDirectManager(ctx.userId, targetPersonId);
        if (!isManager) throw new TRPCError({ code: "FORBIDDEN" });
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
      const myPersonId = await resolveClerkPerson(ctx.userId);
      if (!myPersonId) throw new TRPCError({ code: "FORBIDDEN" });

      const accomplishment = await db.personAccomplishment.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!accomplishment) throw new TRPCError({ code: "NOT_FOUND" });

      if (accomplishment.personId !== myPersonId) {
        const isManager = await isDirectManager(ctx.userId, accomplishment.personId);
        if (!isManager) throw new TRPCError({ code: "FORBIDDEN" });
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
      const myPersonId = await resolveClerkPerson(ctx.userId);
      if (!myPersonId) throw new TRPCError({ code: "FORBIDDEN" });

      const accomplishment = await db.personAccomplishment.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!accomplishment) throw new TRPCError({ code: "NOT_FOUND" });

      if (accomplishment.personId !== myPersonId) {
        const isManager = await isDirectManager(ctx.userId, accomplishment.personId);
        if (!isManager) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.personAccomplishment.delete({ where: { id: input.id } });
    }),
});

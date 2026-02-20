import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
} as const;

export const personCommentRouter = createTRPCRouter({
  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ input }) => {
      return db.personComment.findMany({
        where: { personId: input.personId },
        orderBy: { createdAt: "desc" },
        include: {
          author: { select: authorSelect },
        },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        content: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const authorPerson = await db.person.findUnique({
        where: { clerkUserId: ctx.userId },
        select: { id: true },
      });
      if (!authorPerson) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must claim a Person record first.",
        });
      }

      return db.personComment.create({
        data: {
          personId: input.personId,
          authorId: ctx.userId,
          authorPersonId: authorPerson.id,
          content: input.content,
        },
        include: {
          author: { select: authorSelect },
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.personComment.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!existing || existing.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.personComment.update({
        where: { id: input.id },
        data: { content: input.content },
        include: {
          author: { select: authorSelect },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.personComment.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!existing || existing.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.personComment.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
});

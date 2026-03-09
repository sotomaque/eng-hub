import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { CAPABILITIES } from "../lib/capabilities";
import { createTRPCRouter, protectedProcedure, requirePersonCapability } from "../trpc";

const authorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
} as const;

export const personCommentRouter = createTRPCRouter({
  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .use(requirePersonCapability(CAPABILITIES.PERSON_COMMENTS_READ))
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
    .use(requirePersonCapability(CAPABILITIES.PERSON_COMMENTS_WRITE))
    .mutation(async ({ ctx, input }) => {
      return db.personComment.create({
        data: {
          personId: input.personId,
          authorId: ctx.userId,
          authorPersonId: ctx.personId,
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

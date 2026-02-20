import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { cached, cacheKeys, invalidateMeetingTemplates, ttl } from "../lib/cache";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const meetingTemplateRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return cached(cacheKeys.meetingTemplates, ttl.referenceData, () =>
      db.meetingTemplate.findMany({
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          authorId: true,
          updatedAt: true,
        },
      }),
    );
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const template = await db.meetingTemplate.findUnique({
        where: { id: input.id },
      });
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found.",
        });
      }
      return {
        id: template.id,
        name: template.name,
        description: template.description,
        content: template.content as Record<string, unknown>,
        authorId: template.authorId,
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        content: z.any(), // Prisma Json + tRPC inference requires z.any() (z.record triggers TS2589)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await db.meetingTemplate.create({
        data: {
          name: input.name,
          description: input.description,
          content: input.content ?? {},
          authorId: ctx.userId,
        },
        select: { id: true },
      });
      await invalidateMeetingTemplates();
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
        content: z.any(), // Prisma Json + tRPC inference requires z.any() (z.record triggers TS2589)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = await db.meetingTemplate.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!template || template.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await db.meetingTemplate.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
          content: input.content ?? {},
        },
        select: { id: true },
      });
      await invalidateMeetingTemplates();
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const template = await db.meetingTemplate.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!template || template.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.meetingTemplate.delete({ where: { id: input.id } });
      await invalidateMeetingTemplates();
      return { id: input.id };
    }),
});

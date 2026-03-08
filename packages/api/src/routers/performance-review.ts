import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { isDirectManager, isInManagementChain, resolveClerkPerson } from "../lib/hierarchy";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const scoreField = z.coerce.number().min(1).max(5);

function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error && "code" in error && (error as Record<string, unknown>).code === "P2002"
  );
}

export const performanceReviewRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const personId = await resolveClerkPerson(ctx.userId);
    if (!personId) return [];
    return db.performanceReview.findMany({
      where: { personId },
      orderBy: { reviewDate: "desc" },
      take: 100,
    });
  }),

  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ ctx, input }) => {
      const myPersonId = await resolveClerkPerson(ctx.userId);
      if (myPersonId !== input.personId) {
        const inChain = await isInManagementChain(ctx.userId, input.personId);
        if (!inChain) throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db.performanceReview.findMany({
        where: { personId: input.personId },
        orderBy: { reviewDate: "desc" },
        take: 100,
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const review = await db.performanceReview.findUnique({
      where: { id: input.id },
    });
    if (!review) throw new TRPCError({ code: "NOT_FOUND" });
    const myPersonId = await resolveClerkPerson(ctx.userId);
    if (myPersonId !== review.personId) {
      const inChain = await isInManagementChain(ctx.userId, review.personId);
      if (!inChain) throw new TRPCError({ code: "FORBIDDEN" });
    }
    return review;
  }),

  create: protectedProcedure
    .input(
      z.object({
        personId: z.string().optional(),
        cycleLabel: z.string().min(1, "Cycle label is required"),
        reviewDate: z.coerce.date(),
        coreCompetencyScore: scoreField,
        teamworkScore: scoreField,
        innovationScore: scoreField,
        timeManagementScore: scoreField,
        coreCompetencyComments: z.string().optional(),
        teamworkComments: z.string().optional(),
        innovationComments: z.string().optional(),
        timeManagementComments: z.string().optional(),
        pdfUrl: z.string().url().optional(),
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

      try {
        return await db.performanceReview.create({
          data: {
            personId: targetPersonId,
            authorId: ctx.userId,
            cycleLabel: input.cycleLabel,
            reviewDate: input.reviewDate,
            coreCompetencyScore: input.coreCompetencyScore,
            teamworkScore: input.teamworkScore,
            innovationScore: input.innovationScore,
            timeManagementScore: input.timeManagementScore,
            coreCompetencyComments: input.coreCompetencyComments,
            teamworkComments: input.teamworkComments,
            innovationComments: input.innovationComments,
            timeManagementComments: input.timeManagementComments,
            pdfUrl: input.pdfUrl,
          },
        });
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A review for cycle "${input.cycleLabel}" already exists for this person.`,
          });
        }
        throw error;
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        cycleLabel: z.string().min(1, "Cycle label is required"),
        reviewDate: z.coerce.date(),
        coreCompetencyScore: scoreField,
        teamworkScore: scoreField,
        innovationScore: scoreField,
        timeManagementScore: scoreField,
        coreCompetencyComments: z.string().optional(),
        teamworkComments: z.string().optional(),
        innovationComments: z.string().optional(),
        timeManagementComments: z.string().optional(),
        pdfUrl: z.string().url().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const myPersonId = await resolveClerkPerson(ctx.userId);
      if (!myPersonId) throw new TRPCError({ code: "FORBIDDEN" });

      const review = await db.performanceReview.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });

      if (review.personId !== myPersonId) {
        const isManager = await isDirectManager(ctx.userId, review.personId);
        if (!isManager) throw new TRPCError({ code: "FORBIDDEN" });
      }

      try {
        return await db.performanceReview.update({
          where: { id: input.id },
          data: {
            cycleLabel: input.cycleLabel,
            reviewDate: input.reviewDate,
            coreCompetencyScore: input.coreCompetencyScore,
            teamworkScore: input.teamworkScore,
            innovationScore: input.innovationScore,
            timeManagementScore: input.timeManagementScore,
            coreCompetencyComments: input.coreCompetencyComments,
            teamworkComments: input.teamworkComments,
            innovationComments: input.innovationComments,
            timeManagementComments: input.timeManagementComments,
            pdfUrl: input.pdfUrl ?? null,
          },
        });
      } catch (error) {
        if (isPrismaUniqueConstraintError(error)) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A review for cycle "${input.cycleLabel}" already exists for this person.`,
          });
        }
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const myPersonId = await resolveClerkPerson(ctx.userId);
      if (!myPersonId) throw new TRPCError({ code: "FORBIDDEN" });

      const review = await db.performanceReview.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });

      if (review.personId !== myPersonId) {
        const isManager = await isDirectManager(ctx.userId, review.personId);
        if (!isManager) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.performanceReview.delete({ where: { id: input.id } });
    }),
});

import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { hasPersonCapability } from "../lib/access";
import { CAPABILITIES } from "../lib/capabilities";
import { createTRPCRouter, protectedProcedure, requirePersonCapability } from "../trpc";

const scoreField = z.coerce.number().min(1).max(5).multipleOf(0.5);

function isPrismaUniqueConstraintError(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) return false;
  return (error as { code: string }).code === "P2002";
}

export const performanceReviewRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return db.performanceReview.findMany({
      where: { personId: ctx.personId },
      include: { reviewer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { reviewDate: "desc" },
      take: 100,
    });
  }),

  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .use(requirePersonCapability(CAPABILITIES.PERSON_REVIEWS_READ))
    .query(async ({ input }) => {
      return db.performanceReview.findMany({
        where: { personId: input.personId },
        include: { reviewer: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { reviewDate: "desc" },
        take: 100,
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const review = await db.performanceReview.findUnique({
      where: { id: input.id },
      include: { reviewer: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!review) throw new TRPCError({ code: "NOT_FOUND" });
    const canRead = await hasPersonCapability(
      ctx.access,
      CAPABILITIES.PERSON_REVIEWS_READ,
      review.personId,
    );
    if (!canRead) throw new TRPCError({ code: "FORBIDDEN" });
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
        reviewerId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const targetPersonId = input.personId ?? ctx.personId;

      if (targetPersonId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_REVIEWS_WRITE,
          targetPersonId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
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
            reviewerId: input.reviewerId,
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
        reviewerId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const review = await db.performanceReview.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });

      if (review.personId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_REVIEWS_WRITE,
          review.personId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
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
            ...(input.pdfUrl !== undefined && { pdfUrl: input.pdfUrl ?? null }),
            ...(input.reviewerId !== undefined && { reviewerId: input.reviewerId ?? null }),
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
      const review = await db.performanceReview.findUnique({
        where: { id: input.id },
        select: { personId: true },
      });
      if (!review) throw new TRPCError({ code: "NOT_FOUND" });

      if (review.personId !== ctx.personId) {
        const canWrite = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_REVIEWS_WRITE,
          review.personId,
        );
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.performanceReview.delete({ where: { id: input.id } });
    }),
});

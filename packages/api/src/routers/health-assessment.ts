import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const healthStatusEnum = z.enum(["RED", "YELLOW", "GREEN"]);

const createHealthAssessmentSchema = z.object({
  projectId: z.string(),
  overallStatus: healthStatusEnum,
  overallNotes: z.any().optional(),
  growthStatus: healthStatusEnum.optional(),
  growthNotes: z.any().optional(),
  marginStatus: healthStatusEnum.optional(),
  marginNotes: z.any().optional(),
  longevityStatus: healthStatusEnum.optional(),
  longevityNotes: z.any().optional(),
  clientSatisfactionStatus: healthStatusEnum.optional(),
  clientSatisfactionNotes: z.any().optional(),
  engineeringVibeStatus: healthStatusEnum.optional(),
  engineeringVibeNotes: z.any().optional(),
  productVibeStatus: healthStatusEnum.optional(),
  productVibeNotes: z.any().optional(),
  designVibeStatus: healthStatusEnum.optional(),
  designVibeNotes: z.any().optional(),
});

const updateHealthAssessmentSchema = createHealthAssessmentSchema
  .omit({ projectId: true })
  .extend({ id: z.string() });

export const healthAssessmentRouter = createTRPCRouter({
  getLatest: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.healthAssessment.findFirst({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.healthAssessment.findMany({
        where: { projectId: input.projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const assessment = await db.healthAssessment.findUnique({
      where: { id: input.id },
    });
    if (!assessment) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Health assessment not found.",
      });
    }
    return assessment;
  }),

  create: protectedProcedure
    .input(createHealthAssessmentSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await db.healthAssessment.create({
        data: {
          projectId: input.projectId,
          authorId: ctx.userId,
          overallStatus: input.overallStatus,
          overallNotes: input.overallNotes ?? undefined,
          growthStatus: input.growthStatus ?? undefined,
          growthNotes: input.growthNotes ?? undefined,
          marginStatus: input.marginStatus ?? undefined,
          marginNotes: input.marginNotes ?? undefined,
          longevityStatus: input.longevityStatus ?? undefined,
          longevityNotes: input.longevityNotes ?? undefined,
          clientSatisfactionStatus: input.clientSatisfactionStatus ?? undefined,
          clientSatisfactionNotes: input.clientSatisfactionNotes ?? undefined,
          engineeringVibeStatus: input.engineeringVibeStatus ?? undefined,
          engineeringVibeNotes: input.engineeringVibeNotes ?? undefined,
          productVibeStatus: input.productVibeStatus ?? undefined,
          productVibeNotes: input.productVibeNotes ?? undefined,
          designVibeStatus: input.designVibeStatus ?? undefined,
          designVibeNotes: input.designVibeNotes ?? undefined,
        },
        select: { id: true, projectId: true },
      });
      return result;
    }),

  update: protectedProcedure
    .input(updateHealthAssessmentSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await db.healthAssessment.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!existing || existing.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const result = await db.healthAssessment.update({
        where: { id: input.id },
        data: {
          overallStatus: input.overallStatus,
          overallNotes: input.overallNotes ?? undefined,
          growthStatus: input.growthStatus ?? undefined,
          growthNotes: input.growthNotes ?? undefined,
          marginStatus: input.marginStatus ?? undefined,
          marginNotes: input.marginNotes ?? undefined,
          longevityStatus: input.longevityStatus ?? undefined,
          longevityNotes: input.longevityNotes ?? undefined,
          clientSatisfactionStatus: input.clientSatisfactionStatus ?? undefined,
          clientSatisfactionNotes: input.clientSatisfactionNotes ?? undefined,
          engineeringVibeStatus: input.engineeringVibeStatus ?? undefined,
          engineeringVibeNotes: input.engineeringVibeNotes ?? undefined,
          productVibeStatus: input.productVibeStatus ?? undefined,
          productVibeNotes: input.productVibeNotes ?? undefined,
          designVibeStatus: input.designVibeStatus ?? undefined,
          designVibeNotes: input.designVibeNotes ?? undefined,
        },
        select: { id: true, projectId: true },
      });
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.healthAssessment.findUnique({
        where: { id: input.id },
        select: { authorId: true, projectId: true },
      });
      if (!existing || existing.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.healthAssessment.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
});

import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const roadmapStatusEnum = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "AT_RISK",
]);

const createKeyResultSchema = z
  .object({
    title: z.string().min(1),
    targetValue: z.number().positive(),
    currentValue: z.number().default(0),
    unit: z.string().optional(),
    status: roadmapStatusEnum.default("NOT_STARTED"),
    milestoneId: z.string().optional(),
    quarterlyGoalId: z.string().optional(),
  })
  .refine(
    (d) => (d.milestoneId ? 1 : 0) + (d.quarterlyGoalId ? 1 : 0) === 1,
    {
      message:
        "Exactly one of milestoneId or quarterlyGoalId must be provided",
    },
  );

const updateKeyResultSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  targetValue: z.number().positive(),
  currentValue: z.number(),
  unit: z.string().optional(),
  status: roadmapStatusEnum,
});

export const keyResultRouter = createTRPCRouter({
  create: protectedProcedure
    .input(createKeyResultSchema)
    .mutation(async ({ input }) => {
      const whereClause = input.milestoneId
        ? { milestoneId: input.milestoneId }
        : { quarterlyGoalId: input.quarterlyGoalId };

      const existing = await db.keyResult.count({ where: whereClause });
      if (existing >= 5) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Maximum 5 key results allowed",
        });
      }

      const maxSort = await db.keyResult.aggregate({
        where: whereClause,
        _max: { sortOrder: true },
      });

      return db.keyResult.create({
        data: {
          title: input.title,
          targetValue: input.targetValue,
          currentValue: input.currentValue,
          unit: input.unit,
          status: input.status,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
          milestoneId: input.milestoneId,
          quarterlyGoalId: input.quarterlyGoalId,
        },
      });
    }),

  update: protectedProcedure
    .input(updateKeyResultSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.keyResult.update({ where: { id }, data });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.keyResult.delete({ where: { id: input.id } });
    }),
});

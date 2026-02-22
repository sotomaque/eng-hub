import { db } from "@workspace/db";
import { z } from "zod";
import {
  cached,
  cacheKeys,
  invalidatePeopleCache,
  invalidateReferenceData,
  ttl,
} from "../lib/cache";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const departmentRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return cached(cacheKeys.departments, ttl.referenceData, () =>
      db.department.findMany({
        orderBy: { name: "asc" },
        include: {
          titles: { orderBy: { sortOrder: "asc" } },
          _count: { select: { people: true } },
        },
      }),
    );
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.department.create({
        data: {
          name: input.name,
          color: input.color ?? null,
        },
      });
      await invalidateReferenceData();
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.department.update({
        where: { id: input.id },
        data: { name: input.name, color: input.color },
      });
      await invalidateReferenceData();
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const result = await db.department.delete({ where: { id: input.id } });
      await invalidateReferenceData();
      return result;
    }),

  merge: protectedProcedure
    .input(
      z.object({
        keepId: z.string(),
        mergeIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.$transaction(async (tx) => {
        await tx.person.updateMany({
          where: { departmentId: { in: input.mergeIds } },
          data: { departmentId: input.keepId },
        });
        await tx.title.updateMany({
          where: { departmentId: { in: input.mergeIds } },
          data: { departmentId: input.keepId },
        });
        await tx.department.deleteMany({
          where: { id: { in: input.mergeIds } },
        });
      });
      await Promise.all([invalidateReferenceData(), invalidatePeopleCache()]);
      return result;
    }),
});

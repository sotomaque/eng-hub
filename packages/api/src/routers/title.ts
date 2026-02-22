import { db } from "@workspace/db";
import { after } from "next/server";
import { z } from "zod";
import {
  cached,
  cacheKeys,
  invalidatePeopleCache,
  invalidateReferenceData,
  ttl,
} from "../lib/cache";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const titleRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return cached(cacheKeys.titles, ttl.referenceData, () =>
      db.title.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          department: true,
          _count: { select: { people: true } },
        },
      }),
    );
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        departmentId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const maxSort = await db.title.aggregate({
        _max: { sortOrder: true },
      });
      const result = await db.title.create({
        data: {
          name: input.name,
          departmentId: input.departmentId ?? null,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });
      after(() => invalidateReferenceData());
      return result;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1),
        departmentId: z.string().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await db.title.update({
        where: { id: input.id },
        data: {
          name: input.name,
          departmentId: input.departmentId || null,
        },
      });
      after(() => invalidateReferenceData());
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const result = await db.title.delete({ where: { id: input.id } });
      after(() => invalidateReferenceData());
      return result;
    }),

  reorder: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      const result = await db.$transaction(
        input.ids.map((id, index) =>
          db.title.update({
            where: { id },
            data: { sortOrder: index },
          }),
        ),
      );
      after(() => invalidateReferenceData());
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
          where: { titleId: { in: input.mergeIds } },
          data: { titleId: input.keepId },
        });
        await tx.title.deleteMany({
          where: { id: { in: input.mergeIds } },
        });
      });
      after(() =>
        Promise.all([invalidateReferenceData(), invalidatePeopleCache()]),
      );
      return result;
    }),
});

import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const titleRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return db.title.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        department: true,
        _count: { select: { people: true } },
      },
    });
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
      return db.title.create({
        data: {
          name: input.name,
          departmentId: input.departmentId ?? null,
          sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        },
      });
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
      return db.title.update({
        where: { id: input.id },
        data: {
          name: input.name,
          departmentId: input.departmentId || null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.title.delete({ where: { id: input.id } });
    }),

  reorder: protectedProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      return db.$transaction(
        input.ids.map((id, index) =>
          db.title.update({
            where: { id },
            data: { sortOrder: index },
          }),
        ),
      );
    }),

  merge: protectedProcedure
    .input(
      z.object({
        keepId: z.string(),
        mergeIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        await tx.person.updateMany({
          where: { titleId: { in: input.mergeIds } },
          data: { titleId: input.keepId },
        });
        await tx.title.deleteMany({
          where: { id: { in: input.mergeIds } },
        });
      });
    }),
});

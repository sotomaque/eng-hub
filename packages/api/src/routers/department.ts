import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const departmentRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return db.department.findMany({
      orderBy: { name: "asc" },
      include: {
        titles: { orderBy: { sortOrder: "asc" } },
        _count: { select: { people: true } },
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        color: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.department.create({
        data: {
          name: input.name,
          color: input.color ?? null,
        },
      });
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
      return db.department.update({
        where: { id: input.id },
        data: { name: input.name, color: input.color },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.department.delete({ where: { id: input.id } });
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
    }),
});

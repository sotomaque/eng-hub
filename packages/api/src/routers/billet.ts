import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const billetLevelEnum = z.enum(["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL"]);

export const billetRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.billet.findMany({
        where: { projectId: input.projectId },
        include: {
          department: { select: { id: true, name: true, color: true } },
          title: { select: { id: true, name: true } },
        },
        orderBy: [{ department: { name: "asc" } }, { level: "asc" }],
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        departmentId: z.string(),
        titleId: z.string().optional().or(z.literal("")),
        level: billetLevelEnum,
        count: z.number().int().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      return db.billet.create({
        data: {
          projectId: input.projectId,
          departmentId: input.departmentId,
          titleId: input.titleId || null,
          level: input.level,
          count: input.count,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        departmentId: z.string(),
        titleId: z.string().optional().or(z.literal("")),
        level: billetLevelEnum,
        count: z.number().int().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      return db.billet.update({
        where: { id: input.id },
        data: {
          departmentId: input.departmentId,
          titleId: input.titleId || null,
          level: input.level,
          count: input.count,
        },
      });
    }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return db.billet.delete({ where: { id: input.id } });
  }),
});

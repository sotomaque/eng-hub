import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const managerChangeRouter = createTRPCRouter({
  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ input }) => {
      return db.managerChange.findMany({
        where: { personId: input.personId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return db.managerChange.findMany({
        orderBy: { createdAt: "desc" },
        take: input.limit ?? 20,
        include: {
          person: { select: { id: true, firstName: true, lastName: true } },
          oldManager: {
            select: { id: true, firstName: true, lastName: true },
          },
          newManager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),

  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      // Single query using relation filter instead of two sequential queries
      return db.managerChange.findMany({
        where: {
          person: {
            projectMemberships: { some: { projectId: input.projectId } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit ?? 20,
        include: {
          person: { select: { id: true, firstName: true, lastName: true } },
          oldManager: {
            select: { id: true, firstName: true, lastName: true },
          },
          newManager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
    }),
});

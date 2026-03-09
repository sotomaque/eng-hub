import { db } from "@workspace/db";
import { z } from "zod";
import { CAPABILITIES } from "../lib/capabilities";
import {
  createTRPCRouter,
  protectedProcedure,
  requireCapability,
  requirePersonCapability,
} from "../trpc";

export const managerChangeRouter = createTRPCRouter({
  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .use(requirePersonCapability(CAPABILITIES.PERSON_READ))
    .query(async ({ input }) => {
      return db.managerChange.findMany({
        where: { personId: input.personId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getRecent: protectedProcedure
    .input(z.object({ limit: z.number().optional() }))
    .use(requireCapability(CAPABILITIES.PERSON_READ))
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
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .query(async ({ input }) => {
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

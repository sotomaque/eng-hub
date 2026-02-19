import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const managerChangeRouter = createTRPCRouter({
  getByPersonId: publicProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ input }) => {
      return db.managerChange.findMany({
        where: { personId: input.personId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getRecent: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      const changes = await db.managerChange.findMany({
        orderBy: { createdAt: "desc" },
        take: input.limit ?? 20,
        include: {
          person: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      const managerIds = [
        ...new Set(
          changes
            .flatMap((c) => [c.oldManagerId, c.newManagerId])
            .filter(Boolean) as string[],
        ),
      ];
      const managers =
        managerIds.length > 0
          ? await db.person.findMany({
              where: { id: { in: managerIds } },
              select: { id: true, firstName: true, lastName: true },
            })
          : [];
      const managerMap = new Map(managers.map((m) => [m.id, m]));

      return changes.map((c) => ({
        ...c,
        oldManager: c.oldManagerId ? managerMap.get(c.oldManagerId) ?? null : null,
        newManager: c.newManagerId ? managerMap.get(c.newManagerId) ?? null : null,
      }));
    }),

  getByProjectId: publicProcedure
    .input(z.object({ projectId: z.string(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      // Get all person IDs on this project
      const members = await db.teamMember.findMany({
        where: { projectId: input.projectId },
        select: { personId: true },
      });
      const personIds = members.map((m) => m.personId);

      const changes = await db.managerChange.findMany({
        where: { personId: { in: personIds } },
        orderBy: { createdAt: "desc" },
        take: input.limit ?? 20,
        include: {
          person: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Resolve old/new manager names
      const managerIds = [
        ...new Set(
          changes
            .flatMap((c) => [c.oldManagerId, c.newManagerId])
            .filter(Boolean) as string[],
        ),
      ];
      const managers =
        managerIds.length > 0
          ? await db.person.findMany({
              where: { id: { in: managerIds } },
              select: { id: true, firstName: true, lastName: true },
            })
          : [];
      const managerMap = new Map(managers.map((m) => [m.id, m]));

      return changes.map((c) => ({
        ...c,
        oldManager: c.oldManagerId ? managerMap.get(c.oldManagerId) ?? null : null,
        newManager: c.newManagerId ? managerMap.get(c.newManagerId) ?? null : null,
      }));
    }),
});

import { db } from "@workspace/db";
import { z } from "zod";
import { syncLiveToActiveArrangement } from "../lib/sync-arrangement";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const managerSelect = {
  id: true,
  firstName: true,
  lastName: true,
  callsign: true,
  imageUrl: true,
} as const;

const memberInclude = {
  person: {
    include: {
      manager: { select: managerSelect },
      department: true,
      title: { include: { department: true } },
    },
  },
  teamMemberships: { include: { team: true } },
} as const;

const createTeamMemberSchema = z.object({
  projectId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  callsign: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  titleId: z.string().optional().or(z.literal("")),
  departmentId: z.string(),
  teamIds: z.array(z.string()).optional(),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
});

const updateTeamMemberSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  callsign: z.string().optional().or(z.literal("")),
  email: z.string().email(),
  titleId: z.string().optional().or(z.literal("")),
  departmentId: z.string(),
  teamIds: z.array(z.string()).optional(),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
});

export const teamMemberRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.teamMember.findMany({
        where: { projectId: input.projectId },
        include: memberInclude,
        orderBy: { person: { lastName: "asc" } },
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.teamMember.findUnique({
      where: { id: input.id },
      include: memberInclude,
    });
  }),

  getOrgTree: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.teamMember.findMany({
        where: { projectId: input.projectId },
        include: {
          person: {
            include: {
              manager: { select: managerSelect },
              department: true,
              title: { include: { department: true } },
            },
          },
        },
        orderBy: { person: { lastName: "asc" } },
      });
    }),

  create: protectedProcedure.input(createTeamMemberSchema).mutation(async ({ ctx, input }) => {
    const teamIds = input.teamIds?.filter(Boolean) ?? [];
    const managerId = input.managerId || null;
    const result = await db.$transaction(async (tx) => {
      // Find or create the Person by email
      let person = await tx.person.findUnique({
        where: { email: input.email },
      });
      const affectedManagerIds: (string | null)[] = [];
      if (!person) {
        person = await tx.person.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            callsign: input.callsign || null,
            email: input.email,
            githubUsername: input.githubUsername || null,
            gitlabUsername: input.gitlabUsername || null,
            imageUrl: input.imageUrl || null,
            managerId,
            departmentId: input.departmentId || null,
            titleId: input.titleId || null,
          },
        });

        if (managerId) {
          affectedManagerIds.push(managerId);
          await tx.managerChange.create({
            data: {
              personId: person.id,
              oldManagerId: null,
              newManagerId: managerId,
              changedBy: ctx.userId,
            },
          });
        }
      } else if (managerId && person.managerId !== managerId) {
        affectedManagerIds.push(person.managerId, managerId);
        const oldManagerId = person.managerId;
        await tx.person.update({
          where: { id: person.id },
          data: { managerId },
        });
        await tx.managerChange.create({
          data: {
            personId: person.id,
            oldManagerId,
            newManagerId: managerId,
            changedBy: ctx.userId,
          },
        });
      }

      const member = await tx.teamMember.create({
        data: {
          personId: person.id,
          projectId: input.projectId,
        },
      });

      if (teamIds.length > 0) {
        await tx.teamMembership.createMany({
          data: teamIds.map((teamId) => ({
            teamId,
            teamMemberId: member.id,
          })),
        });
      }

      await syncLiveToActiveArrangement(tx, input.projectId);
      return { member, affectedManagerIds };
    });
    return result.member;
  }),

  update: protectedProcedure.input(updateTeamMemberSchema).mutation(async ({ ctx, input }) => {
    const { id, teamIds: rawTeamIds, ...data } = input;
    const teamIds = rawTeamIds?.filter(Boolean) ?? [];
    const newManagerId = data.managerId || null;
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.teamMember.findUniqueOrThrow({
        where: { id },
        include: {
          person: {
            select: { managerId: true, departmentId: true, titleId: true },
          },
        },
      });

      // Update Person identity fields + managerId + role/title
      const personUpdate: Record<string, unknown> = {
        firstName: data.firstName,
        lastName: data.lastName,
        callsign: data.callsign || null,
        email: data.email,
        githubUsername: data.githubUsername || null,
        gitlabUsername: data.gitlabUsername || null,
        imageUrl: data.imageUrl || null,
        managerId: newManagerId,
        departmentId: data.departmentId || null,
        titleId: data.titleId || null,
      };

      await tx.person.update({
        where: { id: existing.personId },
        data: personUpdate,
      });

      // Log manager change if it changed
      if (newManagerId !== existing.person.managerId) {
        await tx.managerChange.create({
          data: {
            personId: existing.personId,
            oldManagerId: existing.person.managerId,
            newManagerId,
            changedBy: ctx.userId,
          },
        });
      }

      // Sync team memberships
      await tx.teamMembership.deleteMany({
        where: { teamMemberId: id },
      });
      if (teamIds.length > 0) {
        await tx.teamMembership.createMany({
          data: teamIds.map((teamId) => ({
            teamId,
            teamMemberId: id,
          })),
        });
      }

      const member = await tx.teamMember.findUniqueOrThrow({
        where: { id },
      });
      await syncLiveToActiveArrangement(tx, member.projectId);
      const deptOrTitleChanged =
        data.departmentId !== existing.person.departmentId ||
        (data.titleId || null) !== existing.person.titleId;

      return {
        member,
        personId: existing.personId,
        managerChanged: newManagerId !== existing.person.managerId,
        oldManagerId: existing.person.managerId,
        newManagerId,
        deptOrTitleChanged,
      };
    });
    return result.member;
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const result = await db.$transaction(async (tx) => {
      const member = await tx.teamMember.delete({
        where: { id: input.id },
      });
      await syncLiveToActiveArrangement(tx, member.projectId);
      return member;
    });
    return result;
  }),
});

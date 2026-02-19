import { db } from "@workspace/db";
import { z } from "zod";
import { syncLiveToActiveArrangement } from "../lib/sync-arrangement";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const createTeamMemberSchema = z.object({
  projectId: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  titleId: z.string().optional().or(z.literal("")),
  roleId: z.string(),
  teamIds: z.array(z.string()).optional(),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

const updateTeamMemberSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  titleId: z.string().optional().or(z.literal("")),
  roleId: z.string(),
  teamIds: z.array(z.string()).optional(),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const teamMemberRouter = createTRPCRouter({
  getByProjectId: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.teamMember.findMany({
        where: { projectId: input.projectId },
        include: {
          person: true,
          role: true,
          title: true,
          teamMemberships: { include: { team: true } },
        },
        orderBy: { person: { lastName: "asc" } },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.teamMember.findUnique({
        where: { id: input.id },
        include: {
          person: true,
          role: true,
          title: true,
          teamMemberships: { include: { team: true } },
        },
      });
    }),

  create: protectedProcedure
    .input(createTeamMemberSchema)
    .mutation(async ({ input }) => {
      const teamIds = input.teamIds?.filter(Boolean) ?? [];
      return db.$transaction(async (tx) => {
        // Find or create the Person by email
        let person = await tx.person.findUnique({
          where: { email: input.email },
        });
        if (!person) {
          person = await tx.person.create({
            data: {
              firstName: input.firstName,
              lastName: input.lastName,
              email: input.email,
              githubUsername: input.githubUsername || null,
              gitlabUsername: input.gitlabUsername || null,
              imageUrl: input.imageUrl || null,
            },
          });
        }

        const member = await tx.teamMember.create({
          data: {
            personId: person.id,
            projectId: input.projectId,
            roleId: input.roleId,
            titleId: input.titleId || null,
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
        return member;
      });
    }),

  update: protectedProcedure
    .input(updateTeamMemberSchema)
    .mutation(async ({ input }) => {
      const { id, teamIds: rawTeamIds, ...data } = input;
      const teamIds = rawTeamIds?.filter(Boolean) ?? [];
      return db.$transaction(async (tx) => {
        // Get the existing member to find the Person
        const existing = await tx.teamMember.findUniqueOrThrow({
          where: { id },
        });

        // Update Person identity fields
        await tx.person.update({
          where: { id: existing.personId },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            githubUsername: data.githubUsername || null,
            gitlabUsername: data.gitlabUsername || null,
            imageUrl: data.imageUrl || null,
          },
        });

        // Update TeamMember project-specific fields
        const member = await tx.teamMember.update({
          where: { id },
          data: {
            titleId: data.titleId || null,
            roleId: data.roleId,
          },
        });

        // Sync team memberships: delete all, recreate
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

        await syncLiveToActiveArrangement(tx, member.projectId);
        return member;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const member = await tx.teamMember.delete({
          where: { id: input.id },
        });
        await syncLiveToActiveArrangement(tx, member.projectId);
        return member;
      });
    }),
});

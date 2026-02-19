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
  teamId: z.string().optional().or(z.literal("")),
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
  teamId: z.string().optional().or(z.literal("")),
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
        include: { role: true, team: true, title: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.teamMember.findUnique({
        where: { id: input.id },
        include: { role: true, team: true, title: true },
      });
    }),

  create: protectedProcedure
    .input(createTeamMemberSchema)
    .mutation(async ({ input }) => {
      return db.$transaction(async (tx) => {
        const member = await tx.teamMember.create({
          data: {
            projectId: input.projectId,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            titleId: input.titleId || null,
            roleId: input.roleId,
            teamId: input.teamId || null,
            githubUsername: input.githubUsername || null,
            gitlabUsername: input.gitlabUsername || null,
            imageUrl: input.imageUrl || null,
          },
        });
        await syncLiveToActiveArrangement(tx, input.projectId);
        return member;
      });
    }),

  update: protectedProcedure
    .input(updateTeamMemberSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.$transaction(async (tx) => {
        const member = await tx.teamMember.update({
          where: { id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            titleId: data.titleId || null,
            roleId: data.roleId,
            teamId: data.teamId || null,
            githubUsername: data.githubUsername || null,
            gitlabUsername: data.gitlabUsername || null,
            imageUrl: data.imageUrl || null,
          },
        });
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

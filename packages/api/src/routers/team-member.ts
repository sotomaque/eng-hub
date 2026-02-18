import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const createTeamMemberSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
});

const updateTeamMemberSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.string().min(1),
  githubUsername: z.string().optional().or(z.literal("")),
  gitlabUsername: z.string().optional().or(z.literal("")),
});

export const teamMemberRouter = createTRPCRouter({
  getByProjectId: publicProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db.teamMember.findMany({
        where: { projectId: input.projectId },
        orderBy: { name: "asc" },
      });
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.teamMember.findUnique({
        where: { id: input.id },
      });
    }),

  create: protectedProcedure
    .input(createTeamMemberSchema)
    .mutation(async ({ input }) => {
      return db.teamMember.create({
        data: {
          projectId: input.projectId,
          name: input.name,
          email: input.email,
          role: input.role,
          githubUsername: input.githubUsername || null,
          gitlabUsername: input.gitlabUsername || null,
        },
      });
    }),

  update: protectedProcedure
    .input(updateTeamMemberSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.teamMember.update({
        where: { id },
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          githubUsername: data.githubUsername || null,
          gitlabUsername: data.gitlabUsername || null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.teamMember.delete({
        where: { id: input.id },
      });
    }),
});

import { db } from "@workspace/db";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  githubUrl: z.string().url().optional().or(z.literal("")),
  gitlabUrl: z.string().url().optional().or(z.literal("")),
});

const updateProjectSchema = createProjectSchema.extend({
  id: z.string(),
});

export const projectRouter = createTRPCRouter({
  getAll: publicProcedure.query(async () => {
    return db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        statusUpdates: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return db.project.findUnique({
        where: { id: input.id },
        include: {
          statusUpdates: { orderBy: { createdAt: "desc" } },
          teams: { orderBy: { name: "asc" } },
          teamMembers: {
            include: { role: true, team: true, title: true },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          },
          milestones: { orderBy: { targetDate: "asc" } },
          quarterlyGoals: { orderBy: { targetDate: "asc" } },
          links: true,
        },
      });
    }),

  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ input }) => {
      return db.project.create({
        data: {
          name: input.name,
          description: input.description,
          githubUrl: input.githubUrl || null,
          gitlabUrl: input.gitlabUrl || null,
        },
      });
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.project.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          githubUrl: data.githubUrl || null,
          gitlabUrl: data.gitlabUrl || null,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return db.project.delete({
        where: { id: input.id },
      });
    }),
});

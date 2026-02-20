import { db } from "@workspace/db";
import { z } from "zod";
import {
  cached,
  cacheKeys,
  invalidateProjectCache,
  ttl,
} from "../lib/cache";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  githubUrl: z.string().url().optional().or(z.literal("")),
  gitlabUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

const updateProjectSchema = createProjectSchema.extend({
  id: z.string(),
});

function fetchProject(id: string) {
  return db.project.findUnique({
    where: { id },
    include: {
      healthAssessments: { orderBy: { createdAt: "desc" } },
      teams: { orderBy: { name: "asc" } },
      teamMembers: {
        include: {
          person: {
            include: {
              department: true,
              title: { include: { department: true } },
            },
          },
          teamMemberships: { include: { team: true } },
        },
        orderBy: { person: { lastName: "asc" } },
      },
      milestones: {
        where: { parentId: null },
        orderBy: [{ sortOrder: "asc" }, { targetDate: "asc" }],
        include: {
          assignments: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  imageUrl: true,
                },
              },
            },
          },
          keyResults: { orderBy: { sortOrder: "asc" } },
          children: {
            orderBy: [{ sortOrder: "asc" }, { targetDate: "asc" }],
            include: {
              assignments: {
                include: {
                  person: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      imageUrl: true,
                    },
                  },
                },
              },
              keyResults: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      quarterlyGoals: {
        where: { parentId: null },
        orderBy: [{ sortOrder: "asc" }, { targetDate: "asc" }],
        include: {
          assignments: {
            include: {
              person: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  imageUrl: true,
                },
              },
            },
          },
          keyResults: { orderBy: { sortOrder: "asc" } },
          children: {
            orderBy: [{ sortOrder: "asc" }, { targetDate: "asc" }],
            include: {
              assignments: {
                include: {
                  person: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      imageUrl: true,
                    },
                  },
                },
              },
              keyResults: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
      links: true,
    },
  });
}

export const projectRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return cached(cacheKeys.projectList, ttl.projectList, () =>
      db.project.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
    );
  }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const where = input.search
        ? {
            name: { contains: input.search, mode: "insensitive" as const },
          }
        : undefined;
      const [items, totalCount] = await Promise.all([
        db.project.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        db.project.count({ where }),
      ]);
      return { items, totalCount };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return cached(cacheKeys.project(input.id), ttl.project, () =>
        fetchProject(input.id),
      );
    }),

  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ input }) => {
      const result = await db.project.create({
        data: {
          name: input.name,
          description: input.description,
          githubUrl: input.githubUrl || null,
          gitlabUrl: input.gitlabUrl || null,
          imageUrl: input.imageUrl || null,
        },
      });
      await invalidateProjectCache(result.id);
      return result;
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const result = await db.project.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          githubUrl: data.githubUrl || null,
          gitlabUrl: data.gitlabUrl || null,
          imageUrl: data.imageUrl || null,
        },
      });
      await invalidateProjectCache(id);
      return result;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const result = await db.project.delete({
        where: { id: input.id },
      });
      await invalidateProjectCache(input.id);
      return result;
    }),
});

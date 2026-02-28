import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { resolveClerkPerson } from "../lib/hierarchy";
import { detectProjectCycle } from "../lib/roadmap-hierarchy";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  githubUrl: z.string().url().optional().or(z.literal("")),
  gitlabUrl: z.string().url().optional().or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
  fundedById: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
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
        where: { leftAt: null },
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
      owners: {
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
      parent: { select: { id: true, name: true, imageUrl: true } },
      children: {
        select: { id: true, name: true, imageUrl: true },
        orderBy: { name: "asc" },
      },
      fundedBy: { select: { id: true, name: true, imageUrl: true } },
    },
  });
}

export const projectRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async () => {
    return db.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }),

  /** Lightweight list returning only id + name — use for comboboxes/selects. */
  listNames: protectedProcedure.query(async () => {
    return db.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
        status: z.array(z.enum(["GREEN", "YELLOW", "RED", "NONE"])).optional(),
        projectStatus: z.array(z.enum(["ACTIVE", "PAUSED", "ARCHIVED"])).optional(),
        type: z.array(z.enum(["toplevel", "subproject"])).optional(),
        favorite: z.boolean().optional(),
        sortBy: z.enum(["name", "updatedAt", "favorite"]).optional().default("updatedAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.search) {
        where.name = { contains: input.search, mode: "insensitive" as const };
      }
      if (input.projectStatus?.length) {
        where.status = { in: input.projectStatus };
      }
      if (input.status?.length) {
        const realStatuses = input.status.filter((s) => s !== "NONE");
        const hasNone = input.status.includes("NONE");
        const statusConditions: object[] = [];
        if (realStatuses.length > 0) {
          statusConditions.push({
            healthAssessments: {
              some: { overallStatus: { in: realStatuses } },
            },
          });
        }
        if (hasNone) {
          statusConditions.push({ healthAssessments: { none: {} } });
        }
        where.OR = statusConditions;
      }
      if (input.type?.length) {
        const hasToplevel = input.type.includes("toplevel");
        const hasSubproject = input.type.includes("subproject");
        if (hasToplevel && !hasSubproject) {
          where.parentId = null;
        } else if (hasSubproject && !hasToplevel) {
          where.parentId = { not: null };
        }
      }
      const needsPersonId = input.favorite || input.sortBy === "favorite";
      const personId = needsPersonId ? await resolveClerkPerson(ctx.userId) : null;

      if (input.favorite) {
        if (personId) {
          where.favoritedBy = { some: { personId } };
        } else {
          return { items: [], totalCount: 0 };
        }
      }

      if (input.sortBy === "favorite") {
        if (!personId) return { items: [], totalCount: 0 };

        // Fetch all matching IDs with secondary sort by updatedAt
        const allIds = (
          await db.project.findMany({
            where,
            select: { id: true },
            orderBy: { updatedAt: "desc" },
          })
        ).map((p) => p.id);

        const favoritedSet = new Set(
          (
            await db.favoriteProject.findMany({
              where: { personId, projectId: { in: allIds } },
              select: { projectId: true },
            })
          ).map((f) => f.projectId),
        );

        const favIds = allIds.filter((id) => favoritedSet.has(id));
        const nonFavIds = allIds.filter((id) => !favoritedSet.has(id));
        // desc = favorites first (default); asc = favorites last
        const orderedIds =
          input.sortOrder === "asc" ? [...nonFavIds, ...favIds] : [...favIds, ...nonFavIds];

        const skip = (input.page - 1) * input.pageSize;
        const pageIds = orderedIds.slice(skip, skip + input.pageSize);

        if (pageIds.length === 0) {
          return { items: [], totalCount: orderedIds.length };
        }

        const projects = await db.project.findMany({
          where: { id: { in: pageIds } },
          include: {
            healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
            parent: { select: { id: true, name: true } },
          },
        });

        const projectMap = new Map(projects.map((p) => [p.id, p]));
        const items = pageIds
          .map((id) => projectMap.get(id))
          .filter((p): p is NonNullable<typeof p> => !!p);

        return { items, totalCount: orderedIds.length };
      }

      const orderByMap: Record<string, object> = {
        name: { name: input.sortOrder },
        updatedAt: { updatedAt: input.sortOrder },
      };
      const orderBy = orderByMap[input.sortBy] ?? orderByMap.updatedAt;

      const [items, totalCount] = await Promise.all([
        db.project.findMany({
          where,
          orderBy,
          include: {
            healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
            parent: { select: { id: true, name: true } },
          },
          skip: (input.page - 1) * input.pageSize,
          take: input.pageSize,
        }),
        db.project.count({ where }),
      ]);
      return { items, totalCount };
    }),

  listExport: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.array(z.enum(["GREEN", "YELLOW", "RED", "NONE"])).optional(),
        projectStatus: z.array(z.enum(["ACTIVE", "PAUSED", "ARCHIVED"])).optional(),
        type: z.array(z.enum(["toplevel", "subproject"])).optional(),
        favorite: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.search) {
        where.name = { contains: input.search, mode: "insensitive" as const };
      }
      if (input.projectStatus?.length) {
        where.status = { in: input.projectStatus };
      }
      if (input.status?.length) {
        const realStatuses = input.status.filter((s) => s !== "NONE");
        const hasNone = input.status.includes("NONE");
        const statusConditions: object[] = [];
        if (realStatuses.length > 0) {
          statusConditions.push({
            healthAssessments: {
              some: { overallStatus: { in: realStatuses } },
            },
          });
        }
        if (hasNone) {
          statusConditions.push({ healthAssessments: { none: {} } });
        }
        where.OR = statusConditions;
      }
      if (input.type?.length) {
        const hasToplevel = input.type.includes("toplevel");
        const hasSubproject = input.type.includes("subproject");
        if (hasToplevel && !hasSubproject) {
          where.parentId = null;
        } else if (hasSubproject && !hasToplevel) {
          where.parentId = { not: null };
        }
      }
      if (input.favorite) {
        const personId = await resolveClerkPerson(ctx.userId);
        if (personId) {
          where.favoritedBy = { some: { personId } };
        } else {
          return [];
        }
      }

      const STATUS_LABEL: Record<string, string> = {
        GREEN: "Good",
        YELLOW: "Neutral",
        RED: "Bad",
      };

      const projects = await db.project.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
          parent: { select: { name: true } },
        },
      });

      const PROJECT_STATUS_LABEL: Record<string, string> = {
        ACTIVE: "Active",
        PAUSED: "Paused",
        ARCHIVED: "Archived",
      };

      return projects.map((p) => ({
        Name: p.name,
        Description: p.description ?? "",
        "Health Status": p.healthAssessments[0]?.overallStatus
          ? (STATUS_LABEL[p.healthAssessments[0].overallStatus] ?? "No status")
          : "No status",
        "Project Status": PROJECT_STATUS_LABEL[p.status] ?? p.status,
        Type: p.parentId ? "Sub-project" : "Top-level",
        Parent: p.parent?.name ?? "",
        "Updated At": p.updatedAt.toISOString(),
      }));
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return fetchProject(input.id);
  }),

  create: protectedProcedure.input(createProjectSchema).mutation(async ({ input }) => {
    const parentId = input.parentId || null;
    const fundedById = input.fundedById || null;

    const result = await db.project.create({
      data: {
        name: input.name,
        description: input.description,
        githubUrl: input.githubUrl || null,
        gitlabUrl: input.gitlabUrl || null,
        imageUrl: input.imageUrl || null,
        parentId,
        fundedById,
        status: input.status ?? "ACTIVE",
      },
    });

    return result;
  }),

  update: protectedProcedure.input(updateProjectSchema).mutation(async ({ input }) => {
    const { id, ...data } = input;
    const parentId = data.parentId || null;
    const fundedById = data.fundedById || null;

    if (parentId === id || fundedById === id) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "A project cannot reference itself.",
      });
    }

    if (parentId) {
      const hasCycle = await detectProjectCycle(id, parentId);
      if (hasCycle) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Setting this parent would create a circular hierarchy.",
        });
      }
    }

    const result = await db.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        githubUrl: data.githubUrl || null,
        gitlabUrl: data.gitlabUrl || null,
        imageUrl: data.imageUrl || null,
        parentId,
        fundedById,
        status: data.status,
      },
    });

    return result;
  }),

  delete: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    return db.project.delete({
      where: { id: input.id },
    });
  }),

  myFavoriteIds: protectedProcedure.query(async ({ ctx }) => {
    const personId = await resolveClerkPerson(ctx.userId);
    if (!personId) return [];
    const rows = await db.favoriteProject.findMany({
      where: { personId },
      select: { projectId: true },
    });
    return rows.map((r) => r.projectId);
  }),

  isFavorited: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const personId = await resolveClerkPerson(ctx.userId);
      if (!personId) return false;
      const row = await db.favoriteProject.findUnique({
        where: {
          personId_projectId: { personId, projectId: input.projectId },
        },
        select: { id: true },
      });
      return row !== null;
    }),

  toggleFavorite: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const personId = await resolveClerkPerson(ctx.userId);
      if (!personId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No linked person record.",
        });
      }
      const existing = await db.favoriteProject.findUnique({
        where: {
          personId_projectId: { personId, projectId: input.projectId },
        },
      });
      if (existing) {
        await db.favoriteProject.delete({ where: { id: existing.id } });
      } else {
        await db.favoriteProject.create({
          data: { personId, projectId: input.projectId },
        });
      }
      return { favorited: !existing };
    }),

  setOwners: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        personIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      await db.$transaction(async (tx) => {
        await tx.projectOwner.deleteMany({
          where: { projectId: input.projectId },
        });
        if (input.personIds.length > 0) {
          await tx.projectOwner.createMany({
            data: input.personIds.map((personId) => ({
              projectId: input.projectId,
              personId,
            })),
          });
        }
      });
    }),
});

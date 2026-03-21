import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { assertAccess, hasPersonCapability } from "../lib/access";
import { CAPABILITIES } from "../lib/capabilities";
import {
  createTRPCRouter,
  protectedProcedure,
  requireCapability,
  requirePersonCapability,
} from "../trpc";

const tagsSchema = z.array(z.string().min(1).max(50)).max(20).default([]);

const createDocumentSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    fileUrl: z.string().url(),
    fileName: z.string().min(1),
    fileSize: z.number().int().positive().optional(),
    mimeType: z.string().optional(),
    tags: tagsSchema,
    projectId: z.string().optional(),
    personId: z.string().optional(),
  })
  .refine((d) => d.projectId || d.personId, {
    message: "Either projectId or personId must be provided",
  });

const updateDocumentSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: tagsSchema,
});

export const documentRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_DOCUMENTS_READ))
    .query(async ({ input }) => {
      return db.document.findMany({
        where: { projectId: input.projectId },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, callsign: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .use(requirePersonCapability(CAPABILITIES.PERSON_DOCUMENTS_READ))
    .query(async ({ input }) => {
      return db.document.findMany({
        where: { personId: input.personId },
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, callsign: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    return db.document.findUnique({
      where: { id: input.id },
    });
  }),

  create: protectedProcedure.input(createDocumentSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.access) throw new TRPCError({ code: "UNAUTHORIZED" });

    if (input.projectId) {
      assertAccess(ctx.access, CAPABILITIES.PROJECT_DOCUMENTS_WRITE, input.projectId);
    } else if (input.personId) {
      const allowed = await hasPersonCapability(
        ctx.access,
        CAPABILITIES.PERSON_DOCUMENTS_WRITE,
        input.personId,
      );
      if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });
    }

    return db.document.create({
      data: {
        title: input.title,
        description: input.description,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        tags: input.tags,
        projectId: input.projectId,
        personId: input.personId,
        uploadedById: ctx.access.personId,
      },
    });
  }),

  update: protectedProcedure.input(updateDocumentSchema).mutation(async ({ ctx, input }) => {
    if (!ctx.access) throw new TRPCError({ code: "UNAUTHORIZED" });

    const doc = await db.document.findUnique({ where: { id: input.id } });
    if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

    if (doc.projectId) {
      assertAccess(ctx.access, CAPABILITIES.PROJECT_DOCUMENTS_WRITE, doc.projectId);
    } else if (doc.personId) {
      const allowed = await hasPersonCapability(
        ctx.access,
        CAPABILITIES.PERSON_DOCUMENTS_WRITE,
        doc.personId,
      );
      if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });
    }

    return db.document.update({
      where: { id: input.id },
      data: {
        title: input.title,
        description: input.description,
        tags: input.tags,
      },
    });
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.access) throw new TRPCError({ code: "UNAUTHORIZED" });

      const doc = await db.document.findUnique({ where: { id: input.id } });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });

      if (doc.projectId) {
        assertAccess(ctx.access, CAPABILITIES.PROJECT_DOCUMENTS_WRITE, doc.projectId);
      } else if (doc.personId) {
        const allowed = await hasPersonCapability(
          ctx.access,
          CAPABILITIES.PERSON_DOCUMENTS_WRITE,
          doc.personId,
        );
        if (!allowed) throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.document.delete({ where: { id: input.id } });
    }),

  getDistinctTags: protectedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        personId: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const docs = await db.document.findMany({
        where: {
          ...(input.projectId ? { projectId: input.projectId } : {}),
          ...(input.personId ? { personId: input.personId } : {}),
        },
        select: { tags: true },
      });
      const tagSet = new Set(docs.flatMap((d) => d.tags));
      return Array.from(tagSet).sort();
    }),
});

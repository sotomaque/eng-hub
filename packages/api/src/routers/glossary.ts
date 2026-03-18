import { db } from "@workspace/db";
import { z } from "zod";
import { CAPABILITIES } from "../lib/capabilities";
import { createTRPCRouter, protectedProcedure, requireCapability } from "../trpc";

const createGlossaryEntrySchema = z.object({
  projectId: z.string(),
  term: z.string().min(1).max(200),
  definition: z.string().min(1).max(2000),
});

const updateGlossaryEntrySchema = z.object({
  id: z.string(),
  term: z.string().min(1).max(200),
  definition: z.string().min(1).max(2000),
});

export const glossaryRouter = createTRPCRouter({
  getByProjectId: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_GLOSSARY_READ))
    .query(async ({ input }) => {
      return db.glossaryEntry.findMany({
        where: { projectId: input.projectId },
        orderBy: { term: "asc" },
      });
    }),

  create: protectedProcedure
    .input(createGlossaryEntrySchema)
    .use(requireCapability(CAPABILITIES.PROJECT_GLOSSARY_WRITE))
    .mutation(async ({ input }) => {
      return db.glossaryEntry.create({
        data: {
          projectId: input.projectId,
          term: input.term,
          definition: input.definition,
        },
      });
    }),

  update: protectedProcedure
    .input(updateGlossaryEntrySchema)
    .use(requireCapability(CAPABILITIES.PROJECT_GLOSSARY_WRITE))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return db.glossaryEntry.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .use(requireCapability(CAPABILITIES.PROJECT_GLOSSARY_WRITE))
    .mutation(async ({ input }) => {
      return db.glossaryEntry.delete({
        where: { id: input.id },
      });
    }),
});

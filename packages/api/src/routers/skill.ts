import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { CAPABILITIES } from "../lib/capabilities";
import { createTRPCRouter, protectedProcedure, requireCapability } from "../trpc";

export const skillRouter = createTRPCRouter({
  /** All skills in the system — used to populate autocomplete suggestions. */
  getAll: protectedProcedure.use(requireCapability(CAPABILITIES.PERSON_READ)).query(async () => {
    return db.skill.findMany({ orderBy: { name: "asc" } });
  }),

  /** Skills assigned to a specific person. */
  getByPersonId: protectedProcedure
    .use(requireCapability(CAPABILITIES.PERSON_READ))
    .input(z.object({ personId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db.personSkill.findMany({
        where: { personId: input.personId },
        include: { skill: true },
        orderBy: { skill: { name: "asc" } },
      });
      return rows.map((r) => r.skill);
    }),

  /**
   * Replace a person's full skill set.
   * Accepts skill names; creates any that don't exist yet.
   * Requires PERSON_WRITE unless the caller is editing their own record.
   */
  setPersonSkills: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        skillNames: z.array(z.string().trim().min(1)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const isSelf = ctx.personId === input.personId;
      if (!isSelf) {
        const canWrite = ctx.access.capabilities.has(CAPABILITIES.PERSON_WRITE);
        if (!canWrite) throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Upsert each skill by name and collect their IDs
      const skills = await Promise.all(
        input.skillNames.map((name) =>
          db.skill.upsert({
            where: { name },
            create: { name },
            update: {},
          }),
        ),
      );

      // Replace the person's skill associations atomically
      await db.$transaction([
        db.personSkill.deleteMany({ where: { personId: input.personId } }),
        ...skills.map((skill) =>
          db.personSkill.create({
            data: { personId: input.personId, skillId: skill.id },
          }),
        ),
      ]);
    }),
});

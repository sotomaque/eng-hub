import { clerkClient } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { adminProcedure, createTRPCRouter } from "../trpc";

export const adminRouter = createTRPCRouter({
  /** List waitlist entries (default: pending, newest first) */
  waitlistList: adminProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "invited", "completed", "rejected"]).optional(),
          limit: z.number().int().min(1).max(100).optional(),
          offset: z.number().int().min(0).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const client = await clerkClient();
      const { data, totalCount } = await client.waitlistEntries.list({
        status: input?.status ?? "pending",
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
        orderBy: "-created_at",
      });

      return {
        entries: data.map((entry) => ({
          id: entry.id as string,
          emailAddress: entry.emailAddress as string,
          status: entry.status as string,
          createdAt: entry.createdAt as number,
        })),
        totalCount: totalCount as number,
      };
    }),

  /** Approve a waitlist entry and optionally link to a Person */
  waitlistApprove: adminProcedure
    .input(
      z.object({
        waitlistEntryId: z.string(),
        personId: z.string().optional(),
        email: z.string().email(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = await clerkClient();

      // Approve the waitlist entry (sends invitation email)
      await client.waitlistEntries.invite(input.waitlistEntryId, {
        ignoreExisting: true,
      });

      // If a personId was provided, store the mapping for the webhook
      if (input.personId) {
        await db.pendingInvite.upsert({
          where: { email: input.email },
          create: { email: input.email, personId: input.personId },
          update: { personId: input.personId },
        });
      }

      return { success: true };
    }),

  /** Reject a waitlist entry */
  waitlistReject: adminProcedure
    .input(z.object({ waitlistEntryId: z.string() }))
    .mutation(async ({ input }) => {
      const client = await clerkClient();
      await client.waitlistEntries.reject(input.waitlistEntryId);
      return { success: true };
    }),

  /** Send a direct invitation with optional Person linking */
  invite: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        personId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const client = await clerkClient();

      // For direct invitations, set publicMetadata.personId on the invitation
      // so the webhook can auto-link when the user signs up
      await client.invitations.createInvitation({
        emailAddress: input.email,
        publicMetadata: input.personId ? { personId: input.personId } : {},
        notify: true,
        ignoreExisting: true,
      });

      // Also store in PendingInvite as belt-and-suspenders
      if (input.personId) {
        await db.pendingInvite.upsert({
          where: { email: input.email },
          create: { email: input.email, personId: input.personId },
          update: { personId: input.personId },
        });
      }

      return { success: true };
    }),

  /** List Person records not yet linked to a Clerk user */
  unlinkedPeople: adminProcedure.query(async () => {
    return db.person.findMany({
      where: { clerkUserId: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        imageUrl: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }),

  /** Manually link a Person to a Clerk user (admin override) */
  linkPerson: adminProcedure
    .input(
      z.object({
        personId: z.string(),
        clerkUserId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const existing = await db.person.findUnique({
        where: { id: input.personId },
        select: { clerkUserId: true },
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Person not found.",
        });
      }
      if (existing.clerkUserId) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Person is already linked to a Clerk user.",
        });
      }

      await db.person.update({
        where: { id: input.personId },
        data: { clerkUserId: input.clerkUserId },
      });

      return { success: true };
    }),
});

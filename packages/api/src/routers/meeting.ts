import { TRPCError } from "@trpc/server";
import { db } from "@workspace/db";
import { z } from "zod";
import { isInManagementChain } from "../lib/hierarchy";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const meetingInclude = {
  person: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      callsign: true,
      imageUrl: true,
    },
  },
  template: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

function serializeMeeting(m: {
  id: string;
  date: Date;
  content: unknown;
  authorId: string;
  personId: string;
  templateId: string | null;
  createdAt: Date;
  updatedAt: Date;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    callsign: string | null;
    imageUrl: string | null;
  };
  template: { id: string; name: string } | null;
}) {
  return {
    id: m.id,
    date: m.date,
    content: m.content as Record<string, unknown>,
    authorId: m.authorId,
    personId: m.personId,
    templateId: m.templateId,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    person: m.person,
    template: m.template,
  };
}

export const meetingRouter = createTRPCRouter({
  getMyMeetings: protectedProcedure.query(async ({ ctx }) => {
    const meetings = await db.meeting.findMany({
      where: { authorId: ctx.userId },
      include: meetingInclude,
      orderBy: [{ personId: "asc" }, { date: "desc" }],
    });
    return meetings.map(serializeMeeting);
  }),

  getByPersonId: protectedProcedure
    .input(z.object({ personId: z.string() }))
    .query(async ({ ctx, input }) => {
      const hasAccess = await isInManagementChain(ctx.userId, input.personId);
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this person's meeting notes.",
        });
      }

      const meetings = await db.meeting.findMany({
        where: { personId: input.personId },
        include: meetingInclude,
        orderBy: { date: "desc" },
      });
      return meetings.map(serializeMeeting);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const meeting = await db.meeting.findUnique({
        where: { id: input.id },
        include: meetingInclude,
      });
      if (!meeting) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (meeting.authorId !== ctx.userId) {
        const hasAccess = await isInManagementChain(
          ctx.userId,
          meeting.personId,
        );
        if (!hasAccess) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }

      return serializeMeeting(meeting);
    }),

  create: protectedProcedure
    .input(
      z.object({
        personId: z.string(),
        date: z.coerce.date(),
        content: z.any(), // Prisma Json + tRPC inference requires z.any() (z.record triggers TS2589)
        templateId: z.string().optional().or(z.literal("")),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [viewer, reportee] = await Promise.all([
        db.person.findUnique({
          where: { clerkUserId: ctx.userId },
          select: { id: true },
        }),
        db.person.findUnique({
          where: { id: input.personId },
          select: { managerId: true },
        }),
      ]);
      if (!viewer) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must claim a Person record first.",
        });
      }
      if (!reportee || reportee.managerId !== viewer.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only create meeting notes for your direct reports.",
        });
      }

      const created = await db.meeting.create({
        data: {
          personId: input.personId,
          date: input.date,
          content: input.content ?? {},
          authorId: ctx.userId,
          templateId: input.templateId || null,
        },
        select: { id: true },
      });
      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.coerce.date().optional(),
        content: z.any(), // Prisma Json + tRPC inference requires z.any() (z.record triggers TS2589)
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const meeting = await db.meeting.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!meeting || meeting.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await db.meeting.update({
        where: { id: input.id },
        data: {
          ...(input.date && { date: input.date }),
          content: input.content,
        },
        select: { id: true },
      });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const meeting = await db.meeting.findUnique({
        where: { id: input.id },
        select: { authorId: true },
      });
      if (!meeting || meeting.authorId !== ctx.userId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.meeting.delete({ where: { id: input.id } });
      return { id: input.id };
    }),
});

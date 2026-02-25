"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { MeetingForm } from "@/components/meeting-form";
import { useTRPC } from "@/lib/trpc/client";

export default function EditMeetingPage() {
  const params = useParams<{ meetingId: string }>();
  const trpc = useTRPC();

  const meetingQuery = useQuery(trpc.meeting.getById.queryOptions({ id: params.meetingId }));
  const meQuery = useQuery(trpc.person.me.queryOptions());

  if (meetingQuery.isLoading || meQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!meetingQuery.data) {
    notFound();
  }

  const meeting = meetingQuery.data;
  const directReports = meQuery.data?.directReports ?? [];

  return (
    <MeetingForm
      meeting={{
        id: meeting.id,
        date: String(meeting.date),
        content: meeting.content,
        personId: meeting.personId,
        templateId: meeting.templateId,
      }}
      directReports={directReports}
    />
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { MeetingForm } from "@/components/meeting-form";
import { useTRPC } from "@/lib/trpc/client";

export default function NewMeetingPage() {
  const searchParams = useSearchParams();
  const defaultPersonId = searchParams.get("personId") ?? undefined;
  const defaultTemplateId = searchParams.get("templateId") ?? undefined;
  const trpc = useTRPC();

  const meQuery = useQuery(trpc.person.me.queryOptions());

  if (meQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  const directReports = meQuery.data?.directReports ?? [];

  return (
    <MeetingForm
      defaultPersonId={defaultPersonId}
      defaultTemplateId={defaultTemplateId}
      directReports={directReports}
    />
  );
}

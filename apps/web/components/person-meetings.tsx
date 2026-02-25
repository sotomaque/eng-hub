"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible";
import { format } from "date-fns";
import { ChevronRight, Lock, NotebookPen } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc/client";

const EMPTY_MEETINGS: Meeting[] = [];

const TiptapEditor = dynamic(
  () =>
    import("@/components/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
  { ssr: false },
);

interface Meeting {
  id: string;
  date: string;
  content: Record<string, unknown>;
  authorId: string;
  personId: string;
  createdAt: string;
  template: { id: string; name: string } | null;
}

interface PersonMeetingsProps {
  personId: string;
}

export function PersonMeetings({ personId }: PersonMeetingsProps) {
  const trpc = useTRPC();
  const meetingsQuery = useQuery(trpc.meeting.getByPersonId.queryOptions({ personId }));

  // null means no access — hide the section entirely
  if (meetingsQuery.isLoading || meetingsQuery.data === null) return null;

  const meetings = (meetingsQuery.data as Meeting[] | undefined) ?? EMPTY_MEETINGS;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="text-muted-foreground size-4" />
          <CardTitle>1:1 Meeting Notes</CardTitle>
          {meetings.length > 0 && (
            <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
              {meetings.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <NotebookPen className="text-muted-foreground mb-2 size-8" />
            <p className="text-muted-foreground text-sm">No meeting notes yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {meetings.map((meeting) => (
              <MeetingItem key={meeting.id} meeting={meeting} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MeetingItem({ meeting }: { meeting: Meeting }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted">
        <ChevronRight
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="font-medium">{format(new Date(meeting.date), "PPP")}</span>
        {meeting.template && (
          <Badge variant="secondary" className="text-xs">
            {meeting.template.name}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-6 mt-1 mb-2 rounded-md border p-1">
          <TiptapEditor
            initialContent={meeting.content as never}
            editable={false}
            className="border-none [&_.tiptap]:min-h-0"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

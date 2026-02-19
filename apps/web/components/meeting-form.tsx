"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const TiptapEditor = dynamic(
  () =>
    import("@/components/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[250px] w-full animate-pulse rounded-lg border border-input bg-background" />
    ),
  },
);

import { useTRPC } from "@/lib/trpc/client";

interface MeetingFormProps {
  meeting?: {
    id: string;
    date: string;
    content: unknown;
    personId: string;
    templateId: string | null;
  };
  defaultPersonId?: string;
  defaultTemplateId?: string;
  directReports: Array<{ id: string; firstName: string; lastName: string }>;
}

export function MeetingForm({
  meeting,
  defaultPersonId,
  defaultTemplateId,
  directReports,
}: MeetingFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [personId, setPersonId] = useState(
    meeting?.personId ?? defaultPersonId ?? "",
  );
  const [date, setDate] = useState<Date>(
    meeting ? new Date(meeting.date) : new Date(),
  );
  const [templateId, setTemplateId] = useState(
    meeting?.templateId ?? defaultTemplateId ?? "",
  );
  const [content, setContent] = useState<JSONContent>(
    (meeting?.content as JSONContent) ?? {},
  );
  const [templateApplied, setTemplateApplied] = useState(false);

  const templatesQuery = useQuery(trpc.meetingTemplate.getAll.queryOptions());
  const templates = templatesQuery.data ?? [];

  const selectedTemplateQuery = useQuery(
    trpc.meetingTemplate.getById.queryOptions(
      { id: templateId },
      { enabled: !!templateId && !meeting && !templateApplied },
    ),
  );

  useEffect(() => {
    if (selectedTemplateQuery.data && !meeting && !templateApplied) {
      const templateContent = selectedTemplateQuery.data.content as JSONContent;
      if (templateContent && Object.keys(templateContent).length > 0) {
        setContent(structuredClone(templateContent));
        setTemplateApplied(true);
      }
    }
  }, [selectedTemplateQuery.data, meeting, templateApplied]);

  const createMutation = useMutation(
    trpc.meeting.create.mutationOptions({
      onSuccess: () => {
        toast.success("Meeting created");
        router.push("/me/one-on-ones");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.meeting.update.mutationOptions({
      onSuccess: () => {
        toast.success("Meeting updated");
        router.push("/me/one-on-ones");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  const selectedPerson = directReports.find((r) => r.id === personId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personId) {
      toast.error("Please select a direct report");
      return;
    }

    if (meeting) {
      updateMutation.mutate({
        id: meeting.id,
        date,
        content,
      });
    } else {
      createMutation.mutate({
        personId,
        date,
        content,
        templateId: templateId || undefined,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="size-8">
            <Link href="/me/one-on-ones">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {meeting ? "Edit Meeting" : "New 1:1 Meeting"}
            </h1>
            {selectedPerson && (
              <p className="text-muted-foreground text-sm">
                with {selectedPerson.firstName} {selectedPerson.lastName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/me/one-on-ones")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Saving..."
              : meeting
                ? "Save Changes"
                : "Create Meeting"}
          </Button>
        </div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="min-w-[200px] flex-1 space-y-1.5">
          <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Direct Report
          </Label>
          <Select
            value={personId}
            onValueChange={setPersonId}
            disabled={!!meeting}
          >
            <SelectTrigger className="h-9 bg-background">
              <SelectValue placeholder="Select person" />
            </SelectTrigger>
            <SelectContent>
              {directReports.map((report) => (
                <SelectItem key={report.id} value={report.id}>
                  {report.firstName} {report.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48 space-y-1.5">
          <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Date
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "h-9 w-full justify-start bg-background text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 size-3.5" />
                {format(date, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => {
                  if (d) setDate(d);
                }}
              />
            </PopoverContent>
          </Popover>
        </div>

        {!meeting && (
          <div className="min-w-[200px] flex-1 space-y-1.5">
            <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Template
            </Label>
            <Select
              value={templateId}
              onValueChange={(v) => {
                setTemplateId(v);
                setTemplateApplied(false);
              }}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="No template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Editor - full width */}
      <TiptapEditor
        key={templateApplied ? templateId : "default"}
        initialContent={content}
        onChange={setContent}
        className="min-h-[500px]"
      />
    </form>
  );
}

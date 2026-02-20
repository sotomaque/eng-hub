"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { NotebookPen, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

interface Meeting {
  id: string;
  date: string;
  createdAt: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    callsign: string | null;
    imageUrl: string | null;
  };
  template: { id: string; name: string } | null;
}

export default function OneOnOnesPage() {
  const trpc = useTRPC();
  const [filterPersonId, setFilterPersonId] = useState<string | null>(null);
  const meetingsQuery = useQuery(trpc.meeting.getMyMeetings.queryOptions());

  const deleteMutation = useMutation(
    trpc.meeting.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Meeting deleted");
        meetingsQuery.refetch();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const meetings = (meetingsQuery.data ?? []) as Meeting[];

  // Group meetings by person
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { person: Meeting["person"]; meetings: Meeting[] }
    >();
    for (const m of meetings) {
      const existing = map.get(m.person.id);
      if (existing) {
        existing.meetings.push(m);
      } else {
        map.set(m.person.id, { person: m.person, meetings: [m] });
      }
    }
    return map;
  }, [meetings]);

  // Unique people for filter chips
  const people = useMemo(
    () =>
      Array.from(grouped.values())
        .map((g) => g.person)
        .sort((a, b) => a.firstName.localeCompare(b.firstName)),
    [grouped],
  );

  // Filtered groups
  const visibleGroups = useMemo(() => {
    if (!filterPersonId) return Array.from(grouped.values());
    const match = grouped.get(filterPersonId);
    return match ? [match] : [];
  }, [grouped, filterPersonId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">1:1 Meetings</h1>
        <Button asChild>
          <Link href="/me/one-on-ones/new">
            <Plus className="size-4" />
            New Meeting
          </Link>
        </Button>
      </div>

      {grouped.size === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <NotebookPen className="text-muted-foreground mb-4 size-12" />
          <h2 className="text-lg font-semibold">No meetings yet</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Create your first 1:1 meeting note with a direct report.
          </p>
          <Button asChild>
            <Link href="/me/one-on-ones/new">
              <Plus className="size-4" />
              New Meeting
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {people.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFilterPersonId(null)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                  !filterPersonId
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-accent",
                )}
              >
                All
              </button>
              {people.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() =>
                    setFilterPersonId(
                      filterPersonId === person.id ? null : person.id,
                    )
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
                    filterPersonId === person.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent",
                  )}
                >
                  <Avatar className="size-5">
                    <AvatarImage src={person.imageUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {person.firstName[0]}
                      {person.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {person.firstName} {person.lastName}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-8">
            {visibleGroups.map(({ person, meetings: personMeetings }) => (
              <div key={person.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarImage
                      src={person.imageUrl ?? undefined}
                      alt={`${person.firstName} ${person.lastName}`}
                    />
                    <AvatarFallback className="text-xs">
                      {person.firstName[0]}
                      {person.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-lg font-semibold">
                    {person.firstName} {person.lastName}
                  </h2>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/me/one-on-ones/new?personId=${person.id}`}>
                      <Plus className="size-3" />
                      Add
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {personMeetings.map((m) => (
                    <Card key={m.id} className="group relative">
                      <Link href={`/me/one-on-ones/${m.id}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">
                            {format(new Date(m.date), "PPP")}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {m.template && (
                            <Badge variant="secondary" className="text-xs">
                              {m.template.name}
                            </Badge>
                          )}
                        </CardContent>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive absolute top-3 right-3 size-8 opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => deleteMutation.mutate({ id: m.id })}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

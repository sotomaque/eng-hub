"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { format } from "date-fns";
import { ArrowUp } from "lucide-react";
import { useTRPC } from "@/lib/trpc/client";

type TitleHistoryCardProps = {
  personId: string;
};

export function TitleHistoryCard({ personId }: TitleHistoryCardProps) {
  const trpc = useTRPC();
  const { data: entries, isLoading } = useQuery(
    trpc.person.getTitleHistory.queryOptions({ personId }),
  );

  if (isLoading || !entries || entries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Title History
          <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
            {entries.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {entries.map((entry, idx) => {
            const isLast = idx === entries.length - 1;
            const label = entry.oldTitle?.name
              ? `Promoted from ${entry.oldTitle.name}`
              : "Started as";
            return (
              <li key={entry.id} className="relative flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex size-7 items-center justify-center rounded-full border bg-background">
                    <ArrowUp className="size-3.5 text-muted-foreground" />
                  </div>
                  {!isLast && <div className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="text-sm font-medium">{entry.newTitle?.name ?? "— (removed)"}</div>
                  <div className="text-muted-foreground text-xs">
                    {label} · {format(new Date(entry.effectiveAt), "MMM d, yyyy")}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

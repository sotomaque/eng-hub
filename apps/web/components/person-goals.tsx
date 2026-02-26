"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { format } from "date-fns";
import { Target, Trophy } from "lucide-react";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants/roadmap";
import { useTRPC } from "@/lib/trpc/client";

const EMPTY_GOALS: PersonGoal[] = [];
const EMPTY_ACCOMPLISHMENTS: PersonAccomplishment[] = [];

type PersonGoal = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  quarter: string | null;
};

type PersonAccomplishment = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
};

type PersonGoalsProps = {
  personId: string;
};

export function PersonGoals({ personId }: PersonGoalsProps) {
  const trpc = useTRPC();
  const goalsQuery = useQuery(trpc.personGoal.getByPersonId.queryOptions({ personId }));
  const accomplishmentsQuery = useQuery(
    trpc.personAccomplishment.getByPersonId.queryOptions({ personId }),
  );

  if (goalsQuery.isLoading && accomplishmentsQuery.isLoading) return null;

  const goals = (goalsQuery.data as PersonGoal[] | undefined) ?? EMPTY_GOALS;
  const accomplishments =
    (accomplishmentsQuery.data as PersonAccomplishment[] | undefined) ?? EMPTY_ACCOMPLISHMENTS;

  if (goals.length === 0 && accomplishments.length === 0) return null;

  return (
    <div className="space-y-4">
      {goals.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="text-muted-foreground size-4" />
              <CardTitle>Goals</CardTitle>
              <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                {goals.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {goals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{goal.title}</p>
                    {goal.description ? (
                      <p className="mt-0.5 truncate text-muted-foreground text-xs">
                        {goal.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {goal.quarter ? (
                      <Badge variant="secondary" className="text-xs">
                        {goal.quarter}
                      </Badge>
                    ) : null}
                    {goal.targetDate ? (
                      <span className="hidden text-muted-foreground text-xs sm:inline">
                        {new Date(goal.targetDate).toLocaleDateString()}
                      </span>
                    ) : null}
                    <Badge
                      className={STATUS_STYLES[goal.status as keyof typeof STATUS_STYLES] ?? ""}
                    >
                      {STATUS_LABELS[goal.status as keyof typeof STATUS_LABELS] ?? goal.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {accomplishments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="text-muted-foreground size-4" />
              <CardTitle>Accomplishments</CardTitle>
              <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                {accomplishments.length}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {accomplishments.map((accomplishment) => (
                <div
                  key={accomplishment.id}
                  className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{accomplishment.title}</p>
                    {accomplishment.description ? (
                      <p className="mt-0.5 truncate text-muted-foreground text-xs">
                        {accomplishment.description}
                      </p>
                    ) : null}
                  </div>
                  {accomplishment.date ? (
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {format(new Date(accomplishment.date), "MMM d, yyyy")}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

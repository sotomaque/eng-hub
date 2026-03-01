"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { format } from "date-fns";
import { Pencil, Plus, Target, Trash2, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PersonAccomplishmentSheet } from "@/components/person-accomplishment-sheet";
import { PersonGoalSheet } from "@/components/person-goal-sheet";
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
  canEdit?: boolean;
};

export function PersonGoals({ personId, canEdit }: PersonGoalsProps) {
  const trpc = useTRPC();
  const goalsQuery = useQuery(trpc.personGoal.getByPersonId.queryOptions({ personId }));
  const accomplishmentsQuery = useQuery(
    trpc.personAccomplishment.getByPersonId.queryOptions({ personId }),
  );

  const [editingGoal, setEditingGoal] = useState<PersonGoal | null>(null);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [editingAccomplishment, setEditingAccomplishment] = useState<PersonAccomplishment | null>(
    null,
  );
  const [accomplishmentSheetOpen, setAccomplishmentSheetOpen] = useState(false);

  const deleteGoalMutation = useMutation(
    trpc.personGoal.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Goal deleted");
        goalsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteAccomplishmentMutation = useMutation(
    trpc.personAccomplishment.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Accomplishment deleted");
        accomplishmentsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  if (goalsQuery.isLoading && accomplishmentsQuery.isLoading) return null;

  const goals = (goalsQuery.data as PersonGoal[] | undefined) ?? EMPTY_GOALS;
  const accomplishments =
    (accomplishmentsQuery.data as PersonAccomplishment[] | undefined) ?? EMPTY_ACCOMPLISHMENTS;

  if (!canEdit && goals.length === 0 && accomplishments.length === 0) return null;

  return (
    <div className="space-y-4">
      {(goals.length > 0 || canEdit) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="text-muted-foreground size-4" />
              <CardTitle>Goals</CardTitle>
              {goals.length > 0 && (
                <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {goals.length}
                </span>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    setEditingGoal(null);
                    setGoalSheetOpen(true);
                  }}
                >
                  <Plus className="mr-1 size-3.5" />
                  Add Goal
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {goals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No goals yet.</p>
            ) : (
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
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              setEditingGoal(goal);
                              setGoalSheetOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <Trash2 className="size-3.5" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete goal?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete &quot;{goal.title}&quot;.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteGoalMutation.mutate({ id: goal.id })}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(accomplishments.length > 0 || canEdit) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trophy className="text-muted-foreground size-4" />
              <CardTitle>Accomplishments</CardTitle>
              {accomplishments.length > 0 && (
                <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {accomplishments.length}
                </span>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  onClick={() => {
                    setEditingAccomplishment(null);
                    setAccomplishmentSheetOpen(true);
                  }}
                >
                  <Plus className="mr-1 size-3.5" />
                  Log Win
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {accomplishments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No accomplishments yet.</p>
            ) : (
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
                    <div className="flex shrink-0 items-center gap-2">
                      {accomplishment.date ? (
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(accomplishment.date), "MMM d, yyyy")}
                        </span>
                      ) : null}
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => {
                              setEditingAccomplishment(accomplishment);
                              setAccomplishmentSheetOpen(true);
                            }}
                          >
                            <Pencil className="size-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <Trash2 className="size-3.5" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete accomplishment?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete &quot;{accomplishment.title}&quot;.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    deleteAccomplishmentMutation.mutate({ id: accomplishment.id })
                                  }
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {goalSheetOpen && (
        <PersonGoalSheet
          goal={editingGoal ?? undefined}
          personId={personId}
          onClose={() => {
            setGoalSheetOpen(false);
            setEditingGoal(null);
          }}
          onSaved={() => goalsQuery.refetch()}
        />
      )}

      {accomplishmentSheetOpen && (
        <PersonAccomplishmentSheet
          accomplishment={editingAccomplishment ?? undefined}
          personId={personId}
          onClose={() => {
            setAccomplishmentSheetOpen(false);
            setEditingAccomplishment(null);
          }}
          onSaved={() => accomplishmentsQuery.refetch()}
        />
      )}
    </div>
  );
}

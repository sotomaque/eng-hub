"use client";

import type { Milestone, QuarterlyGoal, RoadmapStatus } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Flag, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

const STATUS_STYLES: Record<RoadmapStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  IN_PROGRESS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  AT_RISK: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const STATUS_LABELS: Record<RoadmapStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  AT_RISK: "At Risk",
};

interface RoadmapSectionProps {
  projectId: string;
  milestones: Milestone[];
  quarterlyGoals: QuarterlyGoal[];
}

export function RoadmapSection({
  projectId,
  milestones,
  quarterlyGoals,
}: RoadmapSectionProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deletingMilestone, setDeletingMilestone] = useState<string | null>(
    null,
  );
  const [deletingGoal, setDeletingGoal] = useState<string | null>(null);

  const deleteMilestoneMutation = useMutation(
    trpc.milestone.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Milestone deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeletingMilestone(null),
    }),
  );

  const deleteGoalMutation = useMutation(
    trpc.quarterlyGoal.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Quarterly goal deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeletingGoal(null),
    }),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roadmap</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Milestones */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Milestones</h3>
              <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
                {milestones.length}
              </span>
            </div>
            <Button
              onClick={() =>
                router.push(`/projects/${projectId}?addMilestone=true`, {
                  scroll: false,
                })
              }
              size="sm"
              variant="outline"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {milestones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Flag className="text-muted-foreground mb-2 size-6" />
              <p className="text-muted-foreground text-sm">
                No milestones yet.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Target Date
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.map((milestone) => (
                    <TableRow key={milestone.id}>
                      <TableCell className="font-medium">
                        {milestone.title}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {milestone.targetDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[milestone.status]}>
                          {STATUS_LABELS[milestone.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                `/projects/${projectId}?editMilestone=${milestone.id}`,
                                { scroll: false },
                              )
                            }
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete milestone?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete &quot;
                                  {milestone.title}&quot;.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setDeletingMilestone(milestone.id);
                                    deleteMilestoneMutation.mutate({
                                      id: milestone.id,
                                    });
                                  }}
                                  disabled={deletingMilestone === milestone.id}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  {deletingMilestone === milestone.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Separator />

        {/* Quarterly Goals */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Quarterly Goals</h3>
              <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
                {quarterlyGoals.length}
              </span>
            </div>
            <Button
              onClick={() =>
                router.push(`/projects/${projectId}?addGoal=true`, {
                  scroll: false,
                })
              }
              size="sm"
              variant="outline"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

          {quarterlyGoals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Target className="text-muted-foreground mb-2 size-6" />
              <p className="text-muted-foreground text-sm">
                No quarterly goals yet.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">
                      Target Date
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quarterlyGoals.map((goal) => (
                    <TableRow key={goal.id}>
                      <TableCell className="font-medium">
                        {goal.title}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {goal.targetDate.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[goal.status]}>
                          {STATUS_LABELS[goal.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              router.push(
                                `/projects/${projectId}?editGoal=${goal.id}`,
                                { scroll: false },
                              )
                            }
                          >
                            <Pencil className="size-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete quarterly goal?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete &quot;
                                  {goal.title}&quot;.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setDeletingGoal(goal.id);
                                    deleteGoalMutation.mutate({ id: goal.id });
                                  }}
                                  disabled={deletingGoal === goal.id}
                                  className="bg-destructive text-white hover:bg-destructive/90"
                                >
                                  {deletingGoal === goal.id
                                    ? "Deleting..."
                                    : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

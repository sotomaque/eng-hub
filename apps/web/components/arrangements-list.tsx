"use client";

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
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { CreateArrangementDialog } from "@/components/create-arrangement-dialog";
import { useTRPC } from "@/lib/trpc/client";

interface ArrangementData {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  teams: {
    id: string;
    name: string;
    _count: { assignments: number };
  }[];
}

interface ArrangementsListProps {
  projectId: string;
  projectName: string;
  arrangements: ArrangementData[];
  totalMembers: number;
  hasLiveTeams: boolean;
}

export function ArrangementsList({
  projectId,
  projectName,
  arrangements,
  totalMembers,
  hasLiveTeams,
}: ArrangementsListProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteMutation = useMutation(
    trpc.arrangement.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Configuration deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const activeArrangement = arrangements.find((a) => a.isActive);

  // Sort active arrangement first, then by updatedAt desc (already sorted from server)
  const sorted = [...arrangements].sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Teams</h1>
          <p className="text-muted-foreground text-sm">{projectName}</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="size-4" />
          New Configuration
        </Button>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="text-muted-foreground mb-3 size-10" />
            <h3 className="mb-1 font-semibold">No team configurations yet</h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-sm">
              Create a team configuration to visually organize members into sub-teams. You can
              create multiple proposals and activate the one you want.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" />
              Create First Configuration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((arrangement) => {
            const teamCount = arrangement.teams.length;
            const assignedCount = arrangement.teams.reduce(
              (sum, t) => sum + t._count.assignments,
              0,
            );

            return (
              <Card
                key={arrangement.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/projects/${projectId}/arrangements/${arrangement.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{arrangement.name}</CardTitle>
                    {arrangement.isActive && <Badge variant="default">Live</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground mb-3 space-y-1 text-sm">
                    <p>
                      {teamCount} {teamCount === 1 ? "team" : "teams"}
                    </p>
                    <p>
                      {assignedCount} of {totalMembers} members assigned
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/projects/${projectId}/arrangements/${arrangement.id}`);
                      }}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete configuration?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &quot;
                            {arrangement.name}&quot; and all its team assignments.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMutation.mutate({ id: arrangement.id })}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateArrangementDialog
        projectId={projectId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activeArrangement={activeArrangement ?? null}
        hasLiveTeams={hasLiveTeams}
      />
    </div>
  );
}

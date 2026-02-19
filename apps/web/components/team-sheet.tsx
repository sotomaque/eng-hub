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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

interface TeamSheetProps {
  projectId: string;
}

export function TeamSheet({ projectId }: TeamSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const teamsQuery = useQuery(
    trpc.team.getByProjectId.queryOptions({ projectId }),
  );

  const deleteMutation = useMutation(
    trpc.team.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Team deleted");
        teamsQuery.refetch();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleClose() {
    router.push(`/projects/${projectId}/team`, { scroll: false });
  }

  const teams = teamsQuery.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Manage Teams</SheetTitle>
          <SheetDescription>
            View and manage sub-teams for this project.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 py-4">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2">
              <Avatar className="size-8 shrink-0 rounded-md">
                <AvatarImage src={team.imageUrl ?? undefined} />
                <AvatarFallback className="rounded-md text-xs">
                  {team.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{team.name}</span>
                {team.description && (
                  <p className="text-muted-foreground truncate text-xs">
                    {team.description}
                  </p>
                )}
              </div>
              <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                {team._count.memberships}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  router.push(
                    `/projects/${projectId}/team?editTeam=${team.id}`,
                    { scroll: false },
                  );
                }}
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
                    <AlertDialogTitle>Delete team?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete &quot;{team.name}&quot;. Members will
                      become unassigned.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ id: team.id })}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}

          {teams.length === 0 && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No teams yet. Create a team to organize members into sub-groups.
            </p>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              router.push(`/projects/${projectId}/team?addTeam=true`, {
                scroll: false,
              })
            }
          >
            <Plus className="size-4" />
            Add Team
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

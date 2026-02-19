"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

interface TeamSheetProps {
  projectId: string;
}

export function TeamSheet({ projectId }: TeamSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const teamsQuery = useQuery(
    trpc.team.getByProjectId.queryOptions({ projectId }),
  );

  const createMutation = useMutation(
    trpc.team.create.mutationOptions({
      onSuccess: () => {
        toast.success("Team created");
        setNewName("");
        setIsAdding(false);
        teamsQuery.refetch();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.team.update.mutationOptions({
      onSuccess: () => {
        toast.success("Team updated");
        setEditingId(null);
        teamsQuery.refetch();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
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
    router.push(`/projects/${projectId}`, { scroll: false });
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate({ projectId, name: trimmed });
  }

  function handleUpdate(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    updateMutation.mutate({ id, name: trimmed });
  }

  const teams = teamsQuery.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Teams</SheetTitle>
          <SheetDescription>
            Create and manage sub-teams for this project. Members can optionally
            be assigned to a team.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 py-4">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-2">
              {editingId === team.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUpdate(team.id)
                    }
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(team.id)}
                    disabled={updateMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{team.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(team.id);
                      setEditingName(team.name);
                    }}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate({ id: team.id })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </>
              )}
            </div>
          ))}

          {teams.length === 0 && !isAdding && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No teams yet. Add a team to organize members into sub-groups.
            </p>
          )}

          {isAdding ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Team name"
                className="flex-1"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="animate-spin" />
                )}
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setNewName("");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="size-4" />
              Add Team
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

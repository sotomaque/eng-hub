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

interface RoleSheetProps {
  returnPath: string;
}

export function RoleSheet({ returnPath }: RoleSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const rolesQuery = useQuery(trpc.role.getAll.queryOptions());

  const createMutation = useMutation(
    trpc.role.create.mutationOptions({
      onSuccess: () => {
        toast.success("Role created");
        setNewName("");
        setIsAdding(false);
        rolesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.role.update.mutationOptions({
      onSuccess: () => {
        toast.success("Role updated");
        setEditingId(null);
        rolesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.role.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Role deleted");
        rolesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleClose() {
    router.push(returnPath, { scroll: false });
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed });
  }

  function handleUpdate(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    updateMutation.mutate({ id, name: trimmed });
  }

  const roles = rolesQuery.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Manage Roles</SheetTitle>
          <SheetDescription>
            Roles are shared across all projects. Add, edit, or remove roles
            that can be assigned to team members.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 py-4">
          {roles.map((role) => (
            <div key={role.id} className="flex items-center gap-2">
              {editingId === role.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUpdate(role.id)
                    }
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(role.id)}
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
                  <span className="flex-1 text-sm">{role.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(role.id);
                      setEditingName(role.name);
                    }}
                  >
                    <Pencil className="size-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate({ id: role.id })}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </>
              )}
            </div>
          ))}

          {roles.length === 0 && !isAdding && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No roles yet. Add a role to categorize team members.
            </p>
          )}

          {isAdding ? (
            <div className="flex items-center gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Role name"
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
              Add Role
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

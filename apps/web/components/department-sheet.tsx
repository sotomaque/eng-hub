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

type DepartmentSheetProps = {
  returnPath: string;
};

export function DepartmentSheet({ returnPath }: DepartmentSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const departmentsQuery = useQuery(trpc.department.getAll.queryOptions());

  const createMutation = useMutation(
    trpc.department.create.mutationOptions({
      onSuccess: () => {
        toast.success("Department created");
        setNewName("");
        setIsAdding(false);
        departmentsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.department.update.mutationOptions({
      onSuccess: () => {
        toast.success("Department updated");
        setEditingId(null);
        departmentsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.department.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Department deleted");
        departmentsQuery.refetch();
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

  const departments = departmentsQuery.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Manage Departments</SheetTitle>
          <SheetDescription>
            Departments are shared across all projects. Add, edit, or remove departments that can be
            assigned to team members.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center gap-2">
                {editingId === dept.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(dept.id)}
                      className="flex-1"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleUpdate(dept.id)}
                      disabled={updateMutation.isPending}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    {dept.color && (
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: dept.color }}
                      />
                    )}
                    <span className="flex-1 text-sm">{dept.name}</span>
                    <span className="text-muted-foreground text-xs">{dept._count.people}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(dept.id);
                        setEditingName(dept.name);
                      }}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: dept.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </>
                )}
              </div>
            ))}

            {departments.length === 0 && !isAdding && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No departments yet. Add a department to categorize team members.
              </p>
            )}
          </div>

          <div className="border-t bg-background p-4">
            {isAdding ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Department name"
                  className="flex-1"
                  autoFocus
                />
                <Button size="sm" onClick={handleAdd} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="animate-spin" />}
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
              <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
                <Plus className="size-4" />
                Add Department
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
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

type TitleSheetProps = {
  returnPath: string;
};

export function TitleSheet({ returnPath }: TitleSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [newName, setNewName] = useState("");
  const [newDeptId, setNewDeptId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDeptId, setEditingDeptId] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const titlesQuery = useQuery(trpc.title.getAll.queryOptions());
  const departmentsQuery = useQuery(trpc.department.getAll.queryOptions());

  const createMutation = useMutation(
    trpc.title.create.mutationOptions({
      onSuccess: () => {
        toast.success("Title created");
        setNewName("");
        setNewDeptId("");
        setIsAdding(false);
        titlesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.title.update.mutationOptions({
      onSuccess: () => {
        toast.success("Title updated");
        setEditingId(null);
        titlesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.title.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Title deleted");
        titlesQuery.refetch();
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
    createMutation.mutate({
      name: trimmed,
      departmentId: newDeptId || undefined,
    });
  }

  function handleUpdate(id: string) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    updateMutation.mutate({
      id,
      name: trimmed,
      departmentId: editingDeptId === "none" ? "" : editingDeptId || "",
    });
  }

  const titles = titlesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Manage Titles</SheetTitle>
          <SheetDescription>
            Titles are shared across all projects. Add, edit, or remove titles that can be assigned
            to team members.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {titles.map((title) => (
              <div key={title.id} className="space-y-2">
                {editingId === title.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUpdate(title.id)}
                      className="flex-1"
                      autoFocus
                    />
                    <Select value={editingDeptId} onValueChange={setEditingDeptId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="No department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No department</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            <div className="flex items-center gap-1.5">
                              {dept.color && (
                                <span
                                  className="size-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: dept.color }}
                                />
                              )}
                              {dept.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(title.id)}
                        disabled={updateMutation.isPending}
                      >
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {title.department?.color && (
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: title.department.color }}
                      />
                    )}
                    <div className="flex-1">
                      <span className="text-sm">{title.name}</span>
                      {title.department && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {title.department.name}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground text-xs">{title._count.people}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(title.id);
                        setEditingName(title.name);
                        setEditingDeptId(title.departmentId ?? "none");
                      }}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate({ id: title.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {titles.length === 0 && !isAdding && (
              <p className="text-muted-foreground py-4 text-center text-sm">
                No titles yet. Add a title to categorize team members.
              </p>
            )}
          </div>

          <div className="border-t bg-background p-4">
            {isAdding ? (
              <div className="space-y-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  placeholder="Title name"
                  autoFocus
                />
                <Select value={newDeptId} onValueChange={setNewDeptId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select department (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        <div className="flex items-center gap-1.5">
                          {dept.color && (
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: dept.color }}
                            />
                          )}
                          {dept.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
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
                      setNewDeptId("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" className="w-full" onClick={() => setIsAdding(true)}>
                <Plus className="size-4" />
                Add Title
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

const COLOR_PRESETS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
];

interface Department {
  id: string;
  name: string;
  color: string | null;
  titles: Title[];
  _count: { people: number };
}

interface Title {
  id: string;
  name: string;
  sortOrder: number;
  departmentId: string | null;
}

export function DepartmentManager() {
  const trpc = useTRPC();

  const departmentsQuery = useQuery(trpc.department.getAll.queryOptions());
  const titlesQuery = useQuery(trpc.title.getAll.queryOptions());

  const departments: Department[] = departmentsQuery.data ?? [];
  const allTitles = titlesQuery.data ?? [];
  const unassignedTitles = allTitles.filter((t) => t.departmentId === null);

  // Department mutations
  const createDeptMutation = useMutation(
    trpc.department.create.mutationOptions({
      onSuccess: () => {
        toast.success("Department created");
        departmentsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateDeptMutation = useMutation(
    trpc.department.update.mutationOptions({
      onSuccess: () => {
        toast.success("Department updated");
        departmentsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteDeptMutation = useMutation(
    trpc.department.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Department deleted");
        departmentsQuery.refetch();
        titlesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // Title mutations
  const createTitleMutation = useMutation(
    trpc.title.create.mutationOptions({
      onSuccess: () => {
        toast.success("Title created");
        departmentsQuery.refetch();
        titlesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateTitleMutation = useMutation(
    trpc.title.update.mutationOptions({
      onSuccess: () => {
        toast.success("Title updated");
        departmentsQuery.refetch();
        titlesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteTitleMutation = useMutation(
    trpc.title.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Title deleted");
        departmentsQuery.refetch();
        titlesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const reorderTitleMutation = useMutation(
    trpc.title.reorder.mutationOptions({
      onSuccess: () => {
        departmentsQuery.refetch();
        titlesQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function swapItems(arr: string[], a: number, b: number): string[] {
    const result = [...arr];
    const itemA = result[a];
    const itemB = result[b];
    if (itemA === undefined || itemB === undefined) return result;
    result[a] = itemB;
    result[b] = itemA;
    return result;
  }

  function handleMoveTitleInDept(
    dept: Department,
    titleIndex: number,
    direction: "up" | "down",
  ) {
    const swapIdx = direction === "up" ? titleIndex - 1 : titleIndex + 1;
    const ids = dept.titles.map((t) => t.id);
    if (swapIdx < 0 || swapIdx >= ids.length) return;
    reorderTitleMutation.mutate({ ids: swapItems(ids, titleIndex, swapIdx) });
  }

  if (departmentsQuery.isLoading || titlesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {departments.length > 0 && (
        <Accordion type="multiple" className="space-y-2">
          {departments.map((dept) => (
            <AccordionItem
              key={dept.id}
              value={dept.id}
              className="rounded-lg border last:border-b"
            >
              <div className="flex items-center gap-2 px-4">
                <ColorPicker
                  color={dept.color}
                  onColorChange={(color) =>
                    updateDeptMutation.mutate({
                      id: dept.id,
                      name: dept.name,
                      color,
                    })
                  }
                />
                <AccordionTrigger className="flex-1 py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{dept.name}</span>
                    <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs">
                      {dept._count.people} people
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {dept.titles.length} titles
                    </span>
                  </div>
                </AccordionTrigger>
                <InlineEditButton
                  currentName={dept.name}
                  onSave={(name) =>
                    updateDeptMutation.mutate({
                      id: dept.id,
                      name,
                      color: dept.color ?? undefined,
                    })
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => deleteDeptMutation.mutate({ id: dept.id })}
                  disabled={deleteDeptMutation.isPending}
                >
                  <Trash2 className="size-3.5" />
                  <span className="sr-only">Delete department</span>
                </Button>
              </div>
              <AccordionContent className="px-4 pb-3">
                <div className="ml-8 space-y-1">
                  {dept.titles.map((title, titleIdx) => (
                    <TitleRow
                      key={title.id}
                      title={title}
                      index={titleIdx}
                      totalCount={dept.titles.length}
                      departments={departments}
                      onMoveUp={() =>
                        handleMoveTitleInDept(dept, titleIdx, "up")
                      }
                      onMoveDown={() =>
                        handleMoveTitleInDept(dept, titleIdx, "down")
                      }
                      onUpdate={(name, departmentId) =>
                        updateTitleMutation.mutate({
                          id: title.id,
                          name,
                          departmentId,
                        })
                      }
                      onDelete={() =>
                        deleteTitleMutation.mutate({ id: title.id })
                      }
                    />
                  ))}
                  {dept.titles.length === 0 && (
                    <p className="text-muted-foreground py-2 text-xs">
                      No titles in this department yet.
                    </p>
                  )}
                  <AddItemButton
                    label="Add Title"
                    onAdd={(name) =>
                      createTitleMutation.mutate({
                        name,
                        departmentId: dept.id,
                      })
                    }
                    isPending={createTitleMutation.isPending}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {departments.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            No departments yet. Create your first department to organize titles.
          </p>
        </div>
      )}

      <AddItemButton
        label="Add Department"
        onAdd={(name) => createDeptMutation.mutate({ name })}
        isPending={createDeptMutation.isPending}
      />

      {unassignedTitles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Unassigned Titles</h3>
          <p className="text-muted-foreground text-xs">
            These titles are not assigned to any department. Use the department
            selector to assign them.
          </p>
          <div className="space-y-1">
            {unassignedTitles.map((title) => (
              <TitleRow
                key={title.id}
                title={title}
                index={0}
                totalCount={1}
                departments={departments}
                onUpdate={(name, departmentId) =>
                  updateTitleMutation.mutate({
                    id: title.id,
                    name,
                    departmentId,
                  })
                }
                onDelete={() => deleteTitleMutation.mutate({ id: title.id })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ColorPicker({
  color,
  onColorChange,
}: {
  color: string | null;
  onColorChange: (color: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="size-5 shrink-0 rounded-full border"
          style={{ backgroundColor: color ?? "#9ca3af" }}
        >
          <span className="sr-only">Pick color</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="grid grid-cols-5 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className="size-6 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: preset,
                borderColor: preset === color ? "white" : "transparent",
                boxShadow: preset === color ? `0 0 0 2px ${preset}` : "none",
              }}
              onClick={() => onColorChange(preset)}
            >
              <span className="sr-only">{preset}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function InlineEditButton({
  currentName,
  onSave,
}: {
  currentName: string;
  onSave: (name: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(currentName);

  function handleSave() {
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) {
      onSave(trimmed);
    }
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setIsEditing(false);
          }}
          className="h-7 w-40 text-sm"
          autoFocus
        />
        <Button size="sm" className="h-7" onClick={handleSave}>
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7"
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7"
      onClick={() => {
        setValue(currentName);
        setIsEditing(true);
      }}
    >
      <Pencil className="size-3.5" />
      <span className="sr-only">Edit name</span>
    </Button>
  );
}

function TitleRow({
  title,
  index,
  totalCount,
  departments,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onDelete,
}: {
  title: Title;
  index: number;
  totalCount: number;
  departments: Department[];
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onUpdate: (name: string, departmentId?: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
      {onMoveUp && onMoveDown && (
        <div className="flex flex-col">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ArrowUp className="size-3" />
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={index === totalCount - 1}
            onClick={onMoveDown}
          >
            <ArrowDown className="size-3" />
          </button>
        </div>
      )}
      <span className="flex-1 text-sm">{title.name}</span>
      <DepartmentSelector
        departments={departments}
        currentDepartmentId={title.departmentId}
        onSelect={(departmentId) => onUpdate(title.name, departmentId)}
      />
      <InlineEditButton
        currentName={title.name}
        onSave={(name) => onUpdate(name, title.departmentId ?? undefined)}
      />
      <Button variant="ghost" size="icon" className="size-7" onClick={onDelete}>
        <Trash2 className="size-3.5" />
        <span className="sr-only">Delete title</span>
      </Button>
    </div>
  );
}

function DepartmentSelector({
  departments,
  currentDepartmentId,
  onSelect,
}: {
  departments: Department[];
  currentDepartmentId: string | null;
  onSelect: (departmentId: string) => void;
}) {
  if (departments.length === 0) return null;

  return (
    <Select
      value={currentDepartmentId ?? ""}
      onValueChange={(val) => {
        if (val) onSelect(val);
      }}
    >
      <SelectTrigger className="h-7 w-36 text-xs">
        <SelectValue placeholder="No department" />
      </SelectTrigger>
      <SelectContent>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            <div className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: dept.color ?? "#9ca3af" }}
              />
              {dept.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AddItemButton({
  label,
  onAdd,
  isPending,
}: {
  label: string;
  onAdd: (name: string) => void;
  isPending: boolean;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName("");
    setIsAdding(false);
  }

  if (isAdding) {
    return (
      <div className="flex items-center gap-2 pt-1">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") {
              setIsAdding(false);
              setName("");
            }
          }}
          placeholder={`${label.replace("Add ", "")} name`}
          className="h-8 flex-1"
          autoFocus
        />
        <Button
          size="sm"
          className="h-8"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending && <Loader2 className="animate-spin" />}
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          onClick={() => {
            setIsAdding(false);
            setName("");
          }}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="mt-1"
      onClick={() => setIsAdding(true)}
    >
      <Plus className="size-3.5" />
      {label}
    </Button>
  );
}

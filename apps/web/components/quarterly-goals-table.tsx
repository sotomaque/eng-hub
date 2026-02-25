"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMutation } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
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
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { CornerDownRight, GripVertical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { SortableTableRow } from "@/components/data-table/sortable-table-row";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants/roadmap";
import { useTRPC } from "@/lib/trpc/client";

const statusOptions = [
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "At Risk", value: "AT_RISK" },
];

const depthFilterOptions = [
  { label: "Parent", value: "parent" },
  { label: "Sub-item", value: "sub" },
];

interface AssignmentPerson {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string | null;
  };
}

interface KeyResultItem {
  id: string;
  status: string;
}

interface GoalChild {
  id: string;
  title: string;
  description: string | null;
  quarter: string | null;
  targetDate: string | null;
  status: string;
  sortOrder: number;
  assignments: AssignmentPerson[];
  keyResults: KeyResultItem[];
}

export interface QuarterlyGoalItem {
  id: string;
  title: string;
  description: string | null;
  quarter: string | null;
  targetDate: string | null;
  status: string;
  sortOrder: number;
  parentId: string | null;
  assignments: AssignmentPerson[];
  keyResults: KeyResultItem[];
  children: GoalChild[];
}

interface FlatGoal {
  id: string;
  title: string;
  quarter: string | null;
  targetDate: string | null;
  status: string;
  assignments: AssignmentPerson[];
  keyResults: KeyResultItem[];
  depth: number;
  parentId: string | null;
}

interface QuarterlyGoalsTableProps {
  projectId: string;
  goals: QuarterlyGoalItem[];
  filterStatus?: string[];
  filterQuarter?: string[];
  filterType?: string[];
  filterAssignee?: string[];
}

export function QuarterlyGoalsTable({
  projectId,
  goals,
  filterStatus,
  filterQuarter,
  filterType,
  filterAssignee,
}: QuarterlyGoalsTableProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [, startTransition] = useTransition();

  const deleteMutation = useMutation(
    trpc.quarterlyGoal.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Quarterly goal deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const reorderMutation = useMutation(
    trpc.quarterlyGoal.reorder.mutationOptions({
      onSuccess: () => router.refresh(),
      onError: (error) => toast.error(error.message),
    }),
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const deletingId = deleteMutation.isPending ? (deleteMutation.variables?.id ?? null) : null;

  const buildParams = useCallback(
    (overrides: {
      qgStatus?: string[];
      qgQuarter?: string[];
      qgType?: string[];
      qgAssignee?: string[];
    }) => {
      const params = new URLSearchParams(window.location.search);
      for (const [key, fallback] of [
        ["qgStatus", filterStatus],
        ["qgQuarter", filterQuarter],
        ["qgType", filterType],
        ["qgAssignee", filterAssignee],
      ] as const) {
        const val = overrides[key as keyof typeof overrides] ?? (fallback as string[] | undefined);
        if (val?.length) {
          params.set(key, val.join(","));
        } else {
          params.delete(key);
        }
      }
      return params.toString();
    },
    [filterStatus, filterQuarter, filterType, filterAssignee],
  );

  const handleFilterChange = useCallback(
    (key: "qgStatus" | "qgQuarter" | "qgType" | "qgAssignee", values: string[]) => {
      const qs = buildParams({ [key]: values });
      startTransition(() => {
        router.replace(`/projects/${projectId}/roadmap${qs ? `?${qs}` : ""}`, {
          scroll: false,
        });
      });
    },
    [buildParams, projectId, router],
  );

  const handleResetFilters = useCallback(() => {
    const qs = buildParams({
      qgStatus: [],
      qgQuarter: [],
      qgType: [],
      qgAssignee: [],
    });
    startTransition(() => {
      router.replace(`/projects/${projectId}/roadmap${qs ? `?${qs}` : ""}`, {
        scroll: false,
      });
    });
  }, [buildParams, projectId, router]);

  const filterCount =
    (filterStatus?.length ?? 0) +
    (filterQuarter?.length ?? 0) +
    (filterType?.length ?? 0) +
    (filterAssignee?.length ?? 0);

  const allRows = useMemo(() => {
    const rows: FlatGoal[] = [];
    for (const g of goals) {
      rows.push({
        id: g.id,
        title: g.title,
        quarter: g.quarter,
        targetDate: g.targetDate,
        status: g.status,
        assignments: g.assignments,
        keyResults: g.keyResults,
        depth: 0,
        parentId: null,
      });
      for (const child of g.children) {
        rows.push({
          id: child.id,
          title: child.title,
          quarter: child.quarter,
          targetDate: child.targetDate,
          status: child.status,
          assignments: child.assignments,
          keyResults: child.keyResults,
          depth: 1,
          parentId: g.id,
        });
      }
    }
    return rows;
  }, [goals]);

  const quarterOptions = useMemo(() => {
    const quarters = [...new Set(allRows.map((g) => g.quarter).filter(Boolean))];
    quarters.sort();
    return quarters.map((q) => ({ label: q as string, value: q as string }));
  }, [allRows]);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, { label: string; value: string }>();
    for (const row of allRows) {
      for (const a of row.assignments) {
        if (!map.has(a.person.id)) {
          map.set(a.person.id, {
            label: `${a.person.firstName} ${a.person.lastName}`,
            value: a.person.id,
          });
        }
      }
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [allRows]);

  const flatData = useMemo(() => {
    let rows = allRows;
    if (filterStatus?.length) {
      rows = rows.filter((r) => filterStatus.includes(r.status));
    }
    if (filterQuarter?.length) {
      rows = rows.filter((r) => r.quarter != null && filterQuarter.includes(r.quarter));
    }
    if (filterType?.length) {
      const wantParent = filterType.includes("parent");
      const wantSub = filterType.includes("sub");
      if (wantParent && !wantSub) {
        rows = rows.filter((r) => r.depth === 0);
      } else if (wantSub && !wantParent) {
        rows = rows.filter((r) => r.depth === 1);
      }
    }
    if (filterAssignee?.length) {
      const ids = new Set(filterAssignee);
      rows = rows.filter((r) => r.assignments.some((a) => ids.has(a.person.id)));
    }
    return rows;
  }, [allRows, filterStatus, filterQuarter, filterType, filterAssignee]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeRow = flatData.find((r) => r.id === active.id);
    const overRow = flatData.find((r) => r.id === over.id);
    if (!activeRow || !overRow) return;
    if (activeRow.depth !== overRow.depth) return;
    if (activeRow.parentId !== overRow.parentId) return;

    const group = flatData.filter(
      (r) => r.depth === activeRow.depth && r.parentId === activeRow.parentId,
    );
    const oldIndex = group.findIndex((r) => r.id === active.id);
    const newIndex = group.findIndex((r) => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedIds = arrayMove(
      group.map((r) => r.id),
      oldIndex,
      newIndex,
    );

    reorderMutation.mutate({
      projectId,
      parentId: activeRow.parentId,
      ids: reorderedIds,
    });
  }

  const columns = useMemo<ColumnDef<FlatGoal>[]>(
    () => [
      {
        id: "dragHandle",
        header: () => <span className="sr-only">Drag</span>,
        cell: () => <GripVertical className="size-4 cursor-grab text-muted-foreground" />,
        enableSorting: false,
        size: 30,
      },
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Title" />,
        cell: ({ row }) => {
          const isChild = row.original.depth === 1;
          return (
            <div className="flex items-center gap-1.5">
              {isChild && <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" />}
              <Link
                href={`/projects/${projectId}/roadmap/${row.original.id}`}
                className={`font-medium hover:underline ${isChild ? "text-muted-foreground" : ""}`}
              >
                {row.getValue("title")}
              </Link>
            </div>
          );
        },
      },
      {
        id: "assignees",
        header: () => <span className="hidden text-xs font-medium sm:inline">Assignees</span>,
        cell: ({ row }) => {
          const { assignments } = row.original;
          if (assignments.length === 0) return null;
          const visible = assignments.slice(0, 3);
          const overflow = assignments.length - 3;
          return (
            <div className="hidden items-center sm:flex">
              <div className="flex -space-x-1.5">
                {visible.map((a) => (
                  <Avatar key={a.person.id} className="size-6 border-2 border-background">
                    <AvatarImage src={a.person.imageUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {a.person.firstName[0]}
                      {a.person.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {overflow > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">+{overflow}</span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "keyResults",
        header: () => <span className="hidden text-xs font-medium md:inline">KRs</span>,
        cell: ({ row }) => {
          const krs = row.original.keyResults;
          if (krs.length === 0) return null;
          const completed = krs.filter((kr) => kr.status === "COMPLETED").length;
          return (
            <span className="hidden text-xs text-muted-foreground md:inline">
              {completed}/{krs.length}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "quarter",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Quarter" className="hidden sm:flex" />
        ),
        cell: ({ row }) => (
          <span className="hidden sm:inline">
            {(row.getValue("quarter") as string) || "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "targetDate",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Target Date" className="hidden sm:flex" />
        ),
        cell: ({ row }) => {
          const date = row.getValue("targetDate") as string | null;
          return (
            <span className="hidden text-muted-foreground sm:inline">
              {date ? new Date(date).toLocaleDateString() : "\u2014"}
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge className={STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? ""}>
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const goal = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  router.push(`/projects/${projectId}/roadmap?editGoal=${goal.id}`, {
                    scroll: false,
                  })
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
                    <AlertDialogTitle>Delete quarterly goal?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{goal.title}&quot;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ id: goal.id })}
                      disabled={deletingId === goal.id}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {deletingId === goal.id ? "Deleting…" : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [router, projectId, deleteMutation, deletingId],
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={flatData.map((r) => r.id)} strategy={verticalListSortingStrategy}>
        <DataTable
          columns={columns}
          data={flatData}
          getRowId={(row) => row.id}
          renderRow={({ rowId, children }) => (
            <SortableTableRow id={rowId}>{children}</SortableTableRow>
          )}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchColumn="title"
              searchPlaceholder="Filter goals…"
              filterCount={filterCount}
              onResetFilters={handleResetFilters}
            >
              {quarterOptions.length > 0 && (
                <DataTableFacetedFilter
                  title="Quarter"
                  options={quarterOptions}
                  value={filterQuarter ?? []}
                  onValueChange={(v) => handleFilterChange("qgQuarter", v)}
                />
              )}
              <DataTableFacetedFilter
                title="Status"
                options={statusOptions}
                value={filterStatus ?? []}
                onValueChange={(v) => handleFilterChange("qgStatus", v)}
              />
              <DataTableFacetedFilter
                title="Type"
                options={depthFilterOptions}
                value={filterType ?? []}
                onValueChange={(v) => handleFilterChange("qgType", v)}
              />
              {assigneeOptions.length > 0 && (
                <DataTableFacetedFilter
                  title="Assignee"
                  options={assigneeOptions}
                  value={filterAssignee ?? []}
                  onValueChange={(v) => handleFilterChange("qgAssignee", v)}
                />
              )}
            </DataTableToolbar>
          )}
        />
      </SortableContext>
    </DndContext>
  );
}

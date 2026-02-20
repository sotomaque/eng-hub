"use client";

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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { CornerDownRight, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants/roadmap";
import { useTRPC } from "@/lib/trpc/client";

const statusOptions = [
  { label: "Not Started", value: "NOT_STARTED" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Completed", value: "COMPLETED" },
  { label: "At Risk", value: "AT_RISK" },
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

interface MilestoneChild {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  sortOrder: number;
  assignments: AssignmentPerson[];
  keyResults: KeyResultItem[];
}

export interface MilestoneItem {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  sortOrder: number;
  parentId: string | null;
  assignments: AssignmentPerson[];
  keyResults: KeyResultItem[];
  children: MilestoneChild[];
}

interface FlatMilestone {
  id: string;
  title: string;
  targetDate: string | null;
  status: string;
  assignments: AssignmentPerson[];
  keyResults: KeyResultItem[];
  depth: number;
}

interface MilestonesTableProps {
  projectId: string;
  milestones: MilestoneItem[];
}

export function MilestonesTable({
  projectId,
  milestones,
}: MilestonesTableProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const deleteMutation = useMutation(
    trpc.milestone.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Milestone deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deletingId = deleteMutation.isPending
    ? (deleteMutation.variables?.id ?? null)
    : null;

  const flatData = useMemo(() => {
    const rows: FlatMilestone[] = [];
    for (const m of milestones) {
      rows.push({
        id: m.id,
        title: m.title,
        targetDate: m.targetDate,
        status: m.status,
        assignments: m.assignments,
        keyResults: m.keyResults,
        depth: 0,
      });
      for (const child of m.children) {
        rows.push({
          id: child.id,
          title: child.title,
          targetDate: child.targetDate,
          status: child.status,
          assignments: child.assignments,
          keyResults: child.keyResults,
          depth: 1,
        });
      }
    }
    return rows;
  }, [milestones]);

  const columns = useMemo<ColumnDef<FlatMilestone>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ row }) => {
          const isChild = row.original.depth === 1;
          return (
            <div className="flex items-center gap-1.5">
              {isChild && (
                <CornerDownRight className="size-3.5 shrink-0 text-muted-foreground" />
              )}
              <span
                className={`font-medium ${isChild ? "text-muted-foreground" : ""}`}
              >
                {row.getValue("title")}
              </span>
            </div>
          );
        },
      },
      {
        id: "assignees",
        header: () => (
          <span className="hidden text-xs font-medium sm:inline">
            Assignees
          </span>
        ),
        cell: ({ row }) => {
          const { assignments } = row.original;
          if (assignments.length === 0) return null;
          const visible = assignments.slice(0, 3);
          const overflow = assignments.length - 3;
          return (
            <div className="hidden items-center sm:flex">
              <div className="flex -space-x-1.5">
                {visible.map((a) => (
                  <Avatar
                    key={a.person.id}
                    className="size-6 border-2 border-background"
                  >
                    <AvatarImage src={a.person.imageUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {a.person.firstName[0]}
                      {a.person.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {overflow > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  +{overflow}
                </span>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "keyResults",
        header: () => (
          <span className="hidden text-xs font-medium md:inline">KRs</span>
        ),
        cell: ({ row }) => {
          const krs = row.original.keyResults;
          if (krs.length === 0) return null;
          const completed = krs.filter(
            (kr) => kr.status === "COMPLETED",
          ).length;
          return (
            <span className="hidden text-xs text-muted-foreground md:inline">
              {completed}/{krs.length}
            </span>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "targetDate",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Target Date"
            className="hidden sm:flex"
          />
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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge
              className={
                STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? ""
              }
            >
              {STATUS_LABELS[status as keyof typeof STATUS_LABELS] ?? status}
            </Badge>
          );
        },
        filterFn: (row, id, value: string[]) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const milestone = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  router.push(
                    `/projects/${projectId}/roadmap?editMilestone=${milestone.id}`,
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
                    <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{milestone.title}
                      &quot;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() =>
                        deleteMutation.mutate({ id: milestone.id })
                      }
                      disabled={deletingId === milestone.id}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {deletingId === milestone.id ? "Deleting..." : "Delete"}
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
    <DataTable
      columns={columns}
      data={flatData}
      toolbar={(table) => (
        <DataTableToolbar
          table={table}
          searchColumn="title"
          searchPlaceholder="Filter milestones..."
        >
          {table.getColumn("status") && (
            <DataTableFacetedFilter
              column={table.getColumn("status")}
              title="Status"
              options={statusOptions}
            />
          )}
        </DataTableToolbar>
      )}
    />
  );
}

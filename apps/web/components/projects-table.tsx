"use client";

import type { HealthStatus } from "@prisma/client";
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
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { FolderOpen, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { HEALTH_STATUS_DOT, HEALTH_STATUS_LABEL } from "@/lib/health-status";
import { useTRPC } from "@/lib/trpc/client";

const HEALTH_FILTER_OPTIONS = [
  { label: "Good", value: "GREEN" },
  { label: "Neutral", value: "YELLOW" },
  { label: "Bad", value: "RED" },
  { label: "No status", value: "NONE" },
];

type ProjectItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  updatedAt: string;
  healthStatus: HealthStatus | null;
};

interface ProjectsTableProps {
  projects: ProjectItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  search?: string;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ProjectsTable({
  projects,
  totalCount,
  page,
  pageSize,
  search,
}: ProjectsTableProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [prevSearch, setPrevSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [isSearchPending, startSearchTransition] = useTransition();

  // Render-time prop sync (no useEffect) — handles browser back/forward
  if (search !== prevSearch) {
    setPrevSearch(search);
    setSearchInput(search ?? "");
  }

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams();
        params.set("page", "1");
        params.set("pageSize", String(pageSize));
        if (value) params.set("search", value);
        startSearchTransition(() => {
          router.replace(`/projects?${params.toString()}`, { scroll: false });
        });
      }, 300);
    },
    [pageSize, router],
  );

  const deleteMutation = useMutation(
    trpc.project.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Project deleted");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
      onSettled: () => setDeletingId(null),
    }),
  );

  const handleCreate = useCallback(() => {
    router.push("/projects?create=true", { scroll: false });
  }, [router]);

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/projects?edit=${id}`, { scroll: false });
    },
    [router],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setDeletingId(id);
      deleteMutation.mutate({ id });
    },
    [deleteMutation],
  );

  const columns = useMemo<ColumnDef<ProjectItem>[]>(
    () => [
      {
        id: "name",
        accessorFn: (row) => row.name,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => {
          const project = row.original;
          return (
            <Link
              href={`/projects/${project.id}`}
              className="flex items-center gap-2 hover:underline"
            >
              <Avatar className="size-7 shrink-0 rounded-md">
                <AvatarImage src={project.imageUrl ?? undefined} />
                <AvatarFallback className="rounded-md text-xs">
                  {project.name[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium uppercase tracking-wide">
                {project.name}
              </span>
            </Link>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => row.healthStatus ?? "NONE",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ row }) => {
          const value = row.getValue("status") as string;
          if (value === "NONE") {
            return (
              <span
                className="inline-block size-2.5 rounded-full bg-gray-300 dark:bg-gray-600"
                title="No status"
              />
            );
          }
          const status = value as HealthStatus;
          return (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-block size-2.5 rounded-full ${HEALTH_STATUS_DOT[status]}`}
              />
              <span className="text-muted-foreground text-xs">
                {HEALTH_STATUS_LABEL[status]}
              </span>
            </div>
          );
        },
        filterFn: (row, _id, value: string[]) => {
          const status = row.original.healthStatus ?? "NONE";
          return value.includes(status);
        },
        enableSorting: false,
      },
      {
        id: "description",
        accessorFn: (row) => row.description ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Description"
            className="hidden md:flex"
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground hidden max-w-[300px] truncate md:inline">
            {(row.getValue("description") as string) || "\u2014"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "updatedAt",
        accessorFn: (row) => row.updatedAt,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="Last Updated"
            className="hidden sm:flex"
          />
        ),
        cell: ({ row }) => {
          const date = row.getValue("updatedAt");
          if (!date) return null;
          return (
            <span className="text-muted-foreground hidden text-xs sm:inline">
              {formatRelativeDate(new Date(date as string))}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const project = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(project.id)}
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
                    <AlertDialogTitle>Delete project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{project.name}
                      &quot;. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(project.id)}
                      disabled={deletingId === project.id}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {deletingId === project.id ? "Deleting…" : "Delete"}
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
    [handleEdit, handleDelete, deletingId],
  );

  if (projects.length === 0 && !search) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
        </div>
        <Empty className="min-h-[400px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create your first project to start tracking engineering work.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleCreate}>
              <Plus className="size-4" />
              New Project
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
          <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
            {totalCount}
          </span>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Project</span>
        </Button>
      </div>

      <div
        className={
          isSearchPending
            ? "opacity-60 transition-opacity"
            : "transition-opacity"
        }
      >
        <DataTable
          columns={columns}
          data={projects}
          pageCount={Math.ceil(totalCount / pageSize)}
          pageIndex={page - 1}
          pageSize={pageSize}
          onPageChange={(newPage, newPageSize) => {
            const params = new URLSearchParams();
            params.set("page", String(newPage));
            params.set("pageSize", String(newPageSize));
            if (searchInput) params.set("search", searchInput);
            router.push(`/projects?${params.toString()}`, { scroll: false });
          }}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchColumn="name"
              searchPlaceholder="Search projects…"
              searchValue={searchInput}
              onSearchChange={handleSearchChange}
            >
              {table.getColumn("status") && (
                <DataTableFacetedFilter
                  column={table.getColumn("status")}
                  title="Status"
                  options={HEALTH_FILTER_OPTIONS}
                />
              )}
            </DataTableToolbar>
          )}
        />
      </div>
    </div>
  );
}

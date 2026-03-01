"use client";

import type { HealthStatus, ProjectStatus } from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "@workspace/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty";
import { TableRow } from "@workspace/ui/components/table";
import { FolderOpen, Pencil, Plus, Star, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { ExportButton } from "@/components/export-button";
import { FavoriteButton } from "@/components/favorite-button";
import { HEALTH_STATUS_DOT, HEALTH_STATUS_LABEL } from "@/lib/health-status";
import { PROJECT_STATUS_DOT, PROJECT_STATUS_LABEL } from "@/lib/project-status";
import { useTRPC } from "@/lib/trpc/client";

const HEALTH_FILTER_OPTIONS = [
  { label: "Good", value: "GREEN" },
  { label: "Neutral", value: "YELLOW" },
  { label: "Bad", value: "RED" },
  { label: "No status", value: "NONE" },
];

const TYPE_FILTER_OPTIONS = [
  { label: "Top-level", value: "toplevel" },
  { label: "Sub-project", value: "subproject" },
];

const PROJECT_STATUS_FILTER_OPTIONS = [
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Archived", value: "ARCHIVED" },
];

type ProjectItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  updatedAt: string;
  healthStatus: HealthStatus | null;
  projectStatus: ProjectStatus;
  parentId: string | null;
  parentName: string | null;
  isFavorited: boolean;
};

type ProjectsTableProps = {
  projects: ProjectItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  search?: string;
  status?: string[];
  projectStatus?: string[];
  type?: string[];
  favorite?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

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
  status,
  projectStatus,
  type,
  favorite,
  sortBy,
  sortOrder,
}: ProjectsTableProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
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

  const buildParams = useCallback(
    (overrides: {
      page?: string;
      pageSize?: string;
      search?: string;
      sort?: string;
      order?: string;
      status?: string[];
      projectStatus?: string[];
      type?: string[];
      favorite?: boolean;
    }) => {
      const params = new URLSearchParams();
      params.set("page", overrides.page ?? "1");
      params.set("pageSize", overrides.pageSize ?? String(pageSize));
      const s = overrides.search ?? searchInput;
      if (s) params.set("search", s);
      const sb = overrides.sort ?? sortBy;
      const so = overrides.order ?? sortOrder;
      if (sb) params.set("sortBy", sb);
      if (so) params.set("sortOrder", so);
      const st = overrides.status ?? status;
      if (st?.length) params.set("status", st.join(","));
      const ps = overrides.projectStatus ?? projectStatus;
      if (ps?.length) params.set("projectStatus", ps.join(","));
      const tp = overrides.type ?? type;
      if (tp?.length) params.set("type", tp.join(","));
      const fav = overrides.favorite ?? favorite;
      if (fav) params.set("favorite", "true");
      return params.toString();
    },
    [pageSize, searchInput, sortBy, sortOrder, status, projectStatus, type, favorite],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const qs = buildParams({ page: "1", search: value });
        startSearchTransition(() => {
          router.replace(`/projects?${qs}`, { scroll: false });
        });
      }, 300);
    },
    [buildParams, router],
  );

  const handleStatusChange = useCallback(
    (values: string[]) => {
      const qs = buildParams({ page: "1", status: values });
      startSearchTransition(() => {
        router.replace(`/projects?${qs}`, { scroll: false });
      });
    },
    [buildParams, router],
  );

  const handleTypeChange = useCallback(
    (values: string[]) => {
      const qs = buildParams({ page: "1", type: values });
      startSearchTransition(() => {
        router.replace(`/projects?${qs}`, { scroll: false });
      });
    },
    [buildParams, router],
  );

  const handleProjectStatusChange = useCallback(
    (values: string[]) => {
      const qs = buildParams({ page: "1", projectStatus: values });
      startSearchTransition(() => {
        router.replace(`/projects?${qs}`, { scroll: false });
      });
    },
    [buildParams, router],
  );

  const handleFavoriteToggle = useCallback(() => {
    const qs = buildParams({ page: "1", favorite: !favorite });
    startSearchTransition(() => {
      router.replace(`/projects?${qs}`, { scroll: false });
    });
  }, [buildParams, router, favorite]);

  const handleResetFilters = useCallback(() => {
    clearTimeout(debounceRef.current);
    setSearchInput("");
    const qs = buildParams({
      page: "1",
      search: "",
      status: [],
      projectStatus: [],
      type: [],
      favorite: false,
    });
    startSearchTransition(() => {
      router.replace(`/projects?${qs}`, { scroll: false });
    });
  }, [buildParams, router]);

  const filterCount =
    (status?.length ?? 0) + (projectStatus?.length ?? 0) + (type?.length ?? 0) + (favorite ? 1 : 0);

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
    const params = new URLSearchParams(buildParams({ page: String(page) }));
    params.set("create", "true");
    router.push(`/projects?${params.toString()}`, { scroll: false });
  }, [router, buildParams, page]);

  const handleEdit = useCallback(
    (id: string) => {
      const params = new URLSearchParams(buildParams({ page: String(page) }));
      params.set("edit", id);
      router.push(`/projects?${params.toString()}`, { scroll: false });
    },
    [router, buildParams, page],
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
        id: "favorite",
        accessorFn: (row) => row.isFavorited,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="★" className="pl-2" />
        ),
        cell: ({ row }) => (
          <FavoriteButton projectId={row.original.id} isFavorited={row.original.isFavorited} />
        ),
        size: 40,
        enableHiding: false,
      },
      {
        id: "name",
        accessorFn: (row) => row.name,
        enableHiding: false,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const project = row.original;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="size-7 shrink-0 rounded-md">
                <AvatarImage src={project.imageUrl ?? undefined} />
                <AvatarFallback className="rounded-md text-xs">{project.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-medium uppercase tracking-wide hover:underline"
                >
                  {project.name}
                </Link>
                {project.parentId && project.parentName && (
                  <Link
                    href={`/projects/${project.parentId}`}
                    className="text-muted-foreground text-xs hover:underline"
                  >
                    Sub-project of {project.parentName}
                  </Link>
                )}
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorFn: (row) => row.healthStatus ?? "NONE",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
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
              <span className={`inline-block size-2.5 rounded-full ${HEALTH_STATUS_DOT[status]}`} />
              <span className="text-muted-foreground text-xs">{HEALTH_STATUS_LABEL[status]}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "projectStatus",
        accessorFn: (row) => row.projectStatus,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Lifecycle" className="hidden sm:flex" />
        ),
        cell: ({ row }) => {
          const value = row.getValue("projectStatus") as ProjectStatus;
          return (
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className={`inline-block size-2.5 rounded-full ${PROJECT_STATUS_DOT[value]}`} />
              <span className="text-muted-foreground text-xs">{PROJECT_STATUS_LABEL[value]}</span>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: "description",
        accessorFn: (row) => row.description ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Description" className="hidden md:flex" />
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
          <DataTableColumnHeader column={column} title="Last Updated" className="hidden sm:flex" />
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
              <Button variant="ghost" size="icon" onClick={() => handleEdit(project.id)}>
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
        enableHiding: false,
      },
    ],
    [handleEdit, handleDelete, deletingId],
  );

  const archivedIds = useMemo(
    () => new Set(projects.filter((p) => p.projectStatus === "ARCHIVED").map((p) => p.id)),
    [projects],
  );

  if (
    projects.length === 0 &&
    !search &&
    !status?.length &&
    !projectStatus?.length &&
    !type?.length &&
    !favorite
  ) {
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

      <div className={isSearchPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <DataTable
          columns={columns}
          data={projects}
          getRowId={(row) => row.id}
          renderRow={({ rowId, children }) => (
            <TableRow className={archivedIds.has(rowId) ? "opacity-50" : undefined}>
              {children}
            </TableRow>
          )}
          pageCount={Math.ceil(totalCount / pageSize)}
          pageIndex={page - 1}
          pageSize={pageSize}
          onPageChange={(newPage, newPageSize) => {
            const qs = buildParams({
              page: String(newPage),
              pageSize: String(newPageSize),
            });
            router.push(`/projects?${qs}`, { scroll: false });
          }}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortingChange={(newSortBy, newSortOrder) => {
            const qs = buildParams({
              page: "1",
              sort: newSortBy,
              order: newSortOrder,
            });
            router.push(`/projects?${qs}`, { scroll: false });
          }}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchColumn="name"
              searchPlaceholder="Search projects…"
              searchValue={searchInput}
              onSearchChange={handleSearchChange}
              filterCount={filterCount}
              onResetFilters={handleResetFilters}
            >
              <Button
                variant={favorite ? "secondary" : "outline"}
                size="sm"
                className="h-8"
                onClick={handleFavoriteToggle}
              >
                <Star
                  className={favorite ? "size-3.5 fill-yellow-400 text-yellow-400" : "size-3.5"}
                />
                Favorites
              </Button>
              <DataTableFacetedFilter
                title="Type"
                options={TYPE_FILTER_OPTIONS}
                value={type ?? []}
                onValueChange={handleTypeChange}
              />
              <DataTableFacetedFilter
                title="Health"
                options={HEALTH_FILTER_OPTIONS}
                value={status ?? []}
                onValueChange={handleStatusChange}
              />
              <DataTableFacetedFilter
                title="Lifecycle"
                options={PROJECT_STATUS_FILTER_OPTIONS}
                value={projectStatus ?? []}
                onValueChange={handleProjectStatusChange}
              />
              <ExportButton
                filename="projects"
                fetchData={() =>
                  queryClient.fetchQuery(
                    trpc.project.listExport.queryOptions({
                      search: searchInput || undefined,
                      status: status as ("GREEN" | "YELLOW" | "RED" | "NONE")[] | undefined,
                      projectStatus: projectStatus as
                        | ("ACTIVE" | "PAUSED" | "ARCHIVED")[]
                        | undefined,
                      type: type as ("toplevel" | "subproject")[] | undefined,
                      favorite,
                    }),
                  )
                }
              />
              <DataTableViewOptions
                table={table}
                columnLabels={{
                  status: "Health",
                  projectStatus: "Lifecycle",
                  description: "Description",
                  updatedAt: "Last Updated",
                }}
              />
            </DataTableToolbar>
          )}
        />
      </div>
    </div>
  );
}

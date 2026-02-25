"use client";

import type { Team, TeamMembership } from "@prisma/client";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { FolderPlus, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useTRPC } from "@/lib/trpc/client";

type MembershipWithRelations = {
  id: string;
  projectId: string;
  project: { id: string; name: string };
  teamMemberships: (TeamMembership & { team: Team })[];
};

type PersonWithMemberships = {
  id: string;
  firstName: string;
  lastName: string;
  callsign: string | null;
  email: string;
  imageUrl: string | null;
  githubUsername: string | null;
  gitlabUsername: string | null;
  department: { name: string } | null;
  title: { name: string } | null;
  projectMemberships: MembershipWithRelations[];
};

type PeopleTableProps = {
  people: PersonWithMemberships[];
  projectNames: string[];
  departmentNames: string[];
  totalCount: number;
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  multiProject?: boolean;
  departments?: string[];
  projects?: string[];
};

export function PeopleTable({
  people,
  projectNames,
  departmentNames,
  totalCount,
  page,
  pageSize,
  search,
  sortBy,
  sortOrder,
  multiProject,
  departments,
  projects,
}: PeopleTableProps) {
  const router = useRouter();
  const trpc = useTRPC();
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
      multiProject?: boolean;
      departments?: string[];
      projects?: string[];
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
      const mp = overrides.multiProject !== undefined ? overrides.multiProject : multiProject;
      if (mp) params.set("multiProject", "true");
      const d = overrides.departments ?? departments;
      if (d?.length) params.set("department", d.join(","));
      const p = overrides.projects ?? projects;
      if (p?.length) params.set("project", p.join(","));
      return params.toString();
    },
    [pageSize, searchInput, sortBy, sortOrder, multiProject, departments, projects],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const qs = buildParams({ page: "1", search: value });
        startSearchTransition(() => {
          router.replace(`/people?${qs}`, { scroll: false });
        });
      }, 300);
    },
    [buildParams, router],
  );

  const meQuery = useQuery(trpc.person.me.queryOptions());
  const myPersonId = meQuery.data?.id ?? null;

  const deleteMutation = useMutation(
    trpc.person.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Person deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deletingId = deleteMutation.isPending ? (deleteMutation.variables?.id ?? null) : null;

  const handleFilterChange = useCallback(
    (key: "departments" | "projects", values: string[]) => {
      const qs = buildParams({ page: "1", [key]: values });
      startSearchTransition(() => {
        router.replace(`/people?${qs}`, { scroll: false });
      });
    },
    [buildParams, router],
  );

  const handleResetFilters = useCallback(() => {
    clearTimeout(debounceRef.current);
    setSearchInput("");
    const qs = buildParams({
      page: "1",
      search: "",
      departments: [],
      projects: [],
      multiProject: false,
    });
    startSearchTransition(() => {
      router.replace(`/people?${qs}`, { scroll: false });
    });
  }, [buildParams, router]);

  const handleEdit = useCallback(
    (id: string) => {
      const params = new URLSearchParams(buildParams({ page: String(page) }));
      params.set("edit", id);
      router.push(`/people?${params.toString()}`, { scroll: false });
    },
    [router, buildParams, page],
  );

  const handleAddToProject = useCallback(
    (id: string) => {
      const params = new URLSearchParams(buildParams({ page: String(page) }));
      params.set("addToProject", id);
      router.push(`/people?${params.toString()}`, { scroll: false });
    },
    [router, buildParams, page],
  );

  const filterCount = (departments?.length ?? 0) + (projects?.length ?? 0) + (multiProject ? 1 : 0);

  const projectOptions = useMemo(
    () => projectNames.map((n) => ({ label: n, value: n })),
    [projectNames],
  );

  const departmentOptions = useMemo(
    () => departmentNames.map((d) => ({ label: d, value: d })),
    [departmentNames],
  );

  const columns: ColumnDef<PersonWithMemberships>[] = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) =>
          `${row.firstName}${row.callsign ? ` ${row.callsign}` : ""} ${row.lastName}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        cell: ({ row }) => {
          const person = row.original;
          const isMe = person.id === myPersonId;
          return (
            <Link href={`/people/${person.id}`} className="flex items-center gap-2 hover:underline">
              <Avatar className="size-7 shrink-0">
                <AvatarImage src={person.imageUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {person.firstName[0]}
                  {person.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{row.getValue("name")}</span>
              {isMe && (
                <Badge variant="outline" className="text-xs font-normal">
                  You
                </Badge>
              )}
            </Link>
          );
        },
      },
      {
        id: "email",
        accessorFn: (row) => row.email,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" className="hidden sm:flex" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground hidden sm:inline">{row.getValue("email")}</span>
        ),
      },
      {
        id: "projects",
        accessorFn: (row) => row.projectMemberships.map((m) => m.project.name).join(", "),
        header: ({ column }) => <DataTableColumnHeader column={column} title="Projects" />,
        enableSorting: false,
        cell: ({ row }) => {
          const memberships = row.original.projectMemberships;
          if (memberships.length === 0) {
            return <span className="text-muted-foreground">{"\u2014"}</span>;
          }
          return (
            <div className="flex flex-wrap gap-1">
              {memberships.map((m) => (
                <Badge key={m.id} variant="secondary" className="text-xs">
                  {m.project.name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "departments",
        accessorFn: (row) => row.department?.name ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
        cell: ({ row }) => {
          const val = row.getValue("departments") as string;
          if (!val) {
            return <span className="text-muted-foreground">{"\u2014"}</span>;
          }
          return <span>{val}</span>;
        },
      },
      {
        id: "githubUsername",
        accessorFn: (row) => row.githubUsername ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="GitHub" className="hidden md:flex" />
        ),
        cell: ({ row }) => (
          <span className="hidden md:inline">
            {(row.getValue("githubUsername") as string) || (
              <span className="text-muted-foreground">{"\u2014"}</span>
            )}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const person = row.original;
          return (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => handleEdit(person.id)}>
                <Pencil className="size-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleAddToProject(person.id)}>
                <FolderPlus className="size-4" />
                <span className="sr-only">Add to project</span>
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
                    <AlertDialogTitle>Delete person?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete &quot;{person.firstName} {person.lastName}&quot;
                      and remove them from all projects.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ id: person.id })}
                      disabled={deletingId === person.id}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {deletingId === person.id ? "Deleting\u2026" : "Delete"}
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
    [myPersonId, deleteMutation, deletingId, handleEdit, handleAddToProject],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground text-sm">
            {totalCount} {totalCount === 1 ? "person" : "people"} across all projects
          </p>
        </div>
        <Button
          onClick={() => {
            const params = new URLSearchParams(buildParams({ page: String(page) }));
            params.set("create", "true");
            router.push(`/people?${params.toString()}`, { scroll: false });
          }}
        >
          <Plus className="size-4" />
          Add Person
        </Button>
      </div>

      <div className={isSearchPending ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <DataTable
          columns={columns}
          data={people}
          pageCount={Math.ceil(totalCount / pageSize)}
          pageIndex={page - 1}
          pageSize={pageSize}
          onPageChange={(newPage, newPageSize) => {
            const qs = buildParams({
              page: String(newPage),
              pageSize: String(newPageSize),
            });
            router.push(`/people?${qs}`, { scroll: false });
          }}
          sortBy={sortBy === "department" ? "departments" : sortBy}
          sortOrder={sortOrder}
          onSortingChange={(colId, newSortOrder) => {
            const serverField = colId === "departments" ? "department" : colId;
            const qs = buildParams({
              page: "1",
              sort: serverField,
              order: newSortOrder,
            });
            router.push(`/people?${qs}`, { scroll: false });
          }}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchColumn="name"
              searchPlaceholder="Search people…"
              searchValue={searchInput}
              onSearchChange={handleSearchChange}
              filterCount={filterCount}
              onResetFilters={handleResetFilters}
            >
              {projectOptions.length > 0 && (
                <DataTableFacetedFilter
                  title="Project"
                  options={projectOptions}
                  value={projects ?? []}
                  onValueChange={(v) => handleFilterChange("projects", v)}
                />
              )}
              {departmentOptions.length > 0 && (
                <DataTableFacetedFilter
                  title="Department"
                  options={departmentOptions}
                  value={departments ?? []}
                  onValueChange={(v) => handleFilterChange("departments", v)}
                />
              )}
              <Button
                variant={multiProject ? "default" : "outline"}
                size="sm"
                className="h-8 border-dashed"
                onClick={() => {
                  const qs = buildParams({
                    page: "1",
                    multiProject: !multiProject,
                  });
                  router.push(`/people?${qs}`, { scroll: false });
                }}
              >
                <Layers className="mr-2 size-4" />
                Multi-project
              </Button>
            </DataTableToolbar>
          )}
        />
      </div>
    </div>
  );
}

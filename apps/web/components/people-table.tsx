"use client";

import type { Project, Team, TeamMembership } from "@prisma/client";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { FolderPlus, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
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
  project: Project;
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

interface PeopleTableProps {
  people: PersonWithMemberships[];
  projects: Project[];
  totalCount: number;
  page: number;
  pageSize: number;
  search?: string;
}

export function PeopleTable({
  people,
  projects,
  totalCount,
  page,
  pageSize,
  search,
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
          router.replace(`/people?${params.toString()}`, { scroll: false });
        });
      }, 300);
    },
    [pageSize, router],
  );

  const meQuery = useQuery(trpc.person.me.queryOptions());
  const myPersonId = meQuery.data?.id ?? null;

  const claimMutation = useMutation(
    trpc.person.claimAsMe.mutationOptions({
      onSuccess: () => {
        toast.success("Linked as you");
        meQuery.refetch();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.person.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Person deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deletingId = deleteMutation.isPending
    ? (deleteMutation.variables?.id ?? null)
    : null;

  const projectOptions = useMemo(() => {
    const names = [...new Set(projects.map((p) => p.name))];
    names.sort();
    return names.map((n) => ({ label: n, value: n }));
  }, [projects]);

  const departmentOptions = useMemo(() => {
    const deptNames = new Set<string>();
    for (const p of people) {
      if (p.department) deptNames.add(p.department.name);
    }
    const sorted = [...deptNames];
    sorted.sort();
    return sorted.map((d) => ({ label: d, value: d }));
  }, [people]);

  const columns: ColumnDef<PersonWithMemberships>[] = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) =>
          `${row.firstName}${row.callsign ? ` ${row.callsign}` : ""} ${row.lastName}`,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => {
          const person = row.original;
          const isMe = person.id === myPersonId;
          return (
            <Link
              href={`/people/${person.id}`}
              className="flex items-center gap-2 hover:underline"
            >
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
          <DataTableColumnHeader
            column={column}
            title="Email"
            className="hidden sm:flex"
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground hidden sm:inline">
            {row.getValue("email")}
          </span>
        ),
      },
      {
        id: "projects",
        accessorFn: (row) =>
          row.projectMemberships.map((m) => m.project.name).join(", "),
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Projects" />
        ),
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
        filterFn: (row, _id, value: string[]) => {
          const projectNames = new Set(
            row.original.projectMemberships.map((m) => m.project.name),
          );
          return value.some((v) => projectNames.has(v));
        },
      },
      {
        id: "departments",
        accessorFn: (row) => row.department?.name ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Department" />
        ),
        cell: ({ row }) => {
          const val = row.getValue("departments") as string;
          if (!val) {
            return <span className="text-muted-foreground">{"\u2014"}</span>;
          }
          return <span>{val}</span>;
        },
        filterFn: (row, _id, value: string[]) => {
          const personDepartment = row.original.department?.name;
          return personDepartment ? value.includes(personDepartment) : false;
        },
      },
      {
        id: "githubUsername",
        accessorFn: (row) => row.githubUsername ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title="GitHub"
            className="hidden md:flex"
          />
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
          const isMe = person.id === myPersonId;
          return (
            <div className="flex items-center gap-1">
              {!isMe && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="This is me"
                      disabled={claimMutation.isPending}
                    >
                      <UserCheck className="size-4" />
                      <span className="sr-only">This is me</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Link as you?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will link your account to &quot;{person.firstName}{" "}
                        {person.lastName}&quot;.
                        {myPersonId
                          ? " Your current link will be removed."
                          : ""}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          claimMutation.mutate({ personId: person.id })
                        }
                        disabled={claimMutation.isPending}
                      >
                        {claimMutation.isPending ? "Linking..." : "Confirm"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  router.push(`/people?edit=${person.id}`, { scroll: false })
                }
              >
                <Pencil className="size-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  router.push(`/people?addToProject=${person.id}`, {
                    scroll: false,
                  })
                }
              >
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
                      This will permanently delete &quot;{person.firstName}{" "}
                      {person.lastName}&quot; and remove them from all projects.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate({ id: person.id })}
                      disabled={deletingId === person.id}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      {deletingId === person.id ? "Deleting..." : "Delete"}
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
    [myPersonId, claimMutation, deleteMutation, deletingId, router],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground text-sm">
            {totalCount} {totalCount === 1 ? "person" : "people"} across all
            projects
          </p>
        </div>
        <Button
          onClick={() => router.push("/people?create=true", { scroll: false })}
        >
          <Plus className="size-4" />
          Add Person
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
          data={people}
          pageCount={Math.ceil(totalCount / pageSize)}
          pageIndex={page - 1}
          pageSize={pageSize}
          onPageChange={(newPage, newPageSize) => {
            const params = new URLSearchParams();
            params.set("page", String(newPage));
            params.set("pageSize", String(newPageSize));
            if (searchInput) params.set("search", searchInput);
            router.push(`/people?${params.toString()}`, { scroll: false });
          }}
          toolbar={(table) => (
            <DataTableToolbar
              table={table}
              searchColumn="name"
              searchPlaceholder="Search people..."
              searchValue={searchInput}
              onSearchChange={handleSearchChange}
            >
              {table.getColumn("projects") && projectOptions.length > 0 && (
                <DataTableFacetedFilter
                  column={table.getColumn("projects")}
                  title="Project"
                  options={projectOptions}
                />
              )}
              {table.getColumn("departments") &&
                departmentOptions.length > 0 && (
                  <DataTableFacetedFilter
                    column={table.getColumn("departments")}
                    title="Department"
                    options={departmentOptions}
                  />
                )}
            </DataTableToolbar>
          )}
        />
      </div>
    </div>
  );
}

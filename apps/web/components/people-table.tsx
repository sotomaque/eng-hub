"use client";

import type {
  Person,
  Project,
  Role,
  Team,
  TeamMember,
  TeamMembership,
  Title,
} from "@prisma/client";
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
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useTRPC } from "@/lib/trpc/client";

type MembershipWithRelations = TeamMember & {
  project: Project;
  role: Role;
  title: Title | null;
  teamMemberships: (TeamMembership & { team: Team })[];
};

type PersonWithMemberships = Person & {
  role: Role | null;
  title: Title | null;
  projectMemberships: MembershipWithRelations[];
};

interface PeopleTableProps {
  people: PersonWithMemberships[];
  projects: Project[];
  roles: Role[];
  titles: Title[];
}

export function PeopleTable({ people, projects }: PeopleTableProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      onSettled: () => setDeletingId(null),
    }),
  );

  const projectOptions = useMemo(() => {
    const names = [...new Set(projects.map((p) => p.name))];
    names.sort();
    return names.map((n) => ({ label: n, value: n }));
  }, [projects]);

  const roleOptions = useMemo(() => {
    const roleNames = new Set<string>();
    for (const p of people) {
      if (p.role) roleNames.add(p.role.name);
      for (const m of p.projectMemberships) {
        roleNames.add(m.role.name);
      }
    }
    const sorted = [...roleNames].sort();
    return sorted.map((r) => ({ label: r, value: r }));
  }, [people]);

  const columns: ColumnDef<PersonWithMemberships>[] = [
    {
      id: "name",
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const person = row.original;
        const isMe = person.id === myPersonId;
        return (
          <div className="flex items-center gap-2">
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
          </div>
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
        const projectNames = row.original.projectMemberships.map(
          (m) => m.project.name,
        );
        return value.some((v) => projectNames.includes(v));
      },
    },
    {
      id: "roles",
      accessorFn: (row) => {
        if (row.role) return row.role.name;
        const fromMemberships = [
          ...new Set(row.projectMemberships.map((m) => m.role.name)),
        ];
        return fromMemberships.join(", ");
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const person = row.original;
        const roleName =
          person.role?.name ??
          [...new Set(person.projectMemberships.map((m) => m.role.name))].join(
            ", ",
          );
        if (!roleName) {
          return <span className="text-muted-foreground">{"\u2014"}</span>;
        }
        return <span>{roleName}</span>;
      },
      filterFn: (row, _id, value: string[]) => {
        const personRole = row.original.role?.name;
        if (personRole) return value.includes(personRole);
        const roleNames = row.original.projectMemberships.map(
          (m) => m.role.name,
        );
        return value.some((v) => roleNames.includes(v));
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
              <Button
                variant="ghost"
                size="icon"
                title="This is me"
                onClick={() => claimMutation.mutate({ personId: person.id })}
                disabled={claimMutation.isPending}
              >
                <UserCheck className="size-4" />
                <span className="sr-only">This is me</span>
              </Button>
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
                    onClick={() => {
                      setDeletingId(person.id);
                      deleteMutation.mutate({ id: person.id });
                    }}
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
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">People</h1>
          <p className="text-muted-foreground text-sm">
            {people.length} {people.length === 1 ? "person" : "people"} across
            all projects
          </p>
        </div>
        <Button
          onClick={() => router.push("/people?create=true", { scroll: false })}
        >
          <Plus className="size-4" />
          Add Person
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={people}
        toolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="name"
            searchPlaceholder="Filter people..."
          >
            {table.getColumn("projects") && projectOptions.length > 0 && (
              <DataTableFacetedFilter
                column={table.getColumn("projects")}
                title="Project"
                options={projectOptions}
              />
            )}
            {table.getColumn("roles") && roleOptions.length > 0 && (
              <DataTableFacetedFilter
                column={table.getColumn("roles")}
                title="Role"
                options={roleOptions}
              />
            )}
          </DataTableToolbar>
        )}
      />
    </div>
  );
}

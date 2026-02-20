"use client";

import type { Team, TeamMembership } from "@prisma/client";
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
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { TitleColorMap } from "@/lib/constants/team";
import { TITLE_NO_TITLE_COLOR } from "@/lib/constants/team";
import { useTRPC } from "@/lib/trpc/client";

type MemberWithRelations = {
  id: string;
  personId: string;
  person: {
    firstName: string;
    lastName: string;
    callsign: string | null;
    email: string;
    imageUrl: string | null;
    githubUsername: string | null;
    gitlabUsername: string | null;
    department: { name: string } | null;
    title: { name: string } | null;
  };
  teamMemberships: (TeamMembership & { team: Team })[];
};

interface TeamMembersTableProps {
  projectId: string;
  members: MemberWithRelations[];
  titleColorMap: TitleColorMap;
}

export function TeamMembersTable({
  projectId,
  members,
  titleColorMap,
}: TeamMembersTableProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const deleteMutation = useMutation(
    trpc.teamMember.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Team member removed");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deletingId = deleteMutation.isPending
    ? (deleteMutation.variables?.id ?? null)
    : null;

  const titleOptions = useMemo(() => {
    const titles = [
      ...new Set(members.map((m) => m.person.title?.name).filter(Boolean)),
    ];
    titles.sort();
    return titles.map((t) => ({ label: t as string, value: t as string }));
  }, [members]);

  const departmentOptions = useMemo(() => {
    const depts = [
      ...new Set(
        members
          .map((m) => m.person.department?.name)
          .filter(Boolean) as string[],
      ),
    ];
    depts.sort();
    return depts.map((d) => ({ label: d, value: d }));
  }, [members]);

  const columns: ColumnDef<MemberWithRelations>[] = [
    {
      id: "name",
      accessorFn: (row) =>
        `${row.person.firstName}${row.person.callsign ? ` ${row.person.callsign}` : ""} ${row.person.lastName}`,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => {
        const member = row.original;
        return (
          <Link
            href={`/people/${member.personId}`}
            className="flex items-center gap-2 hover:underline"
          >
            <Avatar className="size-7 shrink-0">
              <AvatarImage src={member.person.imageUrl ?? undefined} />
              <AvatarFallback className="text-xs">
                {member.person.firstName[0]}
                {member.person.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{row.getValue("name")}</span>
          </Link>
        );
      },
    },
    {
      id: "email",
      accessorFn: (row) => row.person.email,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Email"
          className="hidden sm:flex"
        />
      ),
      cell: ({ row }) => (
        <span className="hidden text-muted-foreground sm:inline">
          {row.getValue("email")}
        </span>
      ),
    },
    {
      id: "titleName",
      accessorFn: (row) => row.person.title?.name ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="Title"
          className="hidden lg:flex"
        />
      ),
      cell: ({ row }) => {
        const val = row.getValue("titleName") as string;
        if (!val) {
          return (
            <span className="text-muted-foreground hidden lg:inline">
              {"\u2014"}
            </span>
          );
        }
        const color = titleColorMap.get(val) ?? TITLE_NO_TITLE_COLOR;
        return (
          <span className="hidden lg:inline">
            <Badge
              className="border-0 text-white"
              style={{ backgroundColor: color }}
            >
              {val}
            </Badge>
          </span>
        );
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id) as string);
      },
    },
    {
      id: "departmentName",
      accessorFn: (row) => row.person.department?.name ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Department" />
      ),
      cell: ({ row }) => {
        const val = row.getValue("departmentName") as string;
        return val ? (
          <span>{val}</span>
        ) : (
          <span className="text-muted-foreground">{"\u2014"}</span>
        );
      },
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id) as string);
      },
    },
    {
      id: "githubUsername",
      accessorFn: (row) => row.person.githubUsername ?? "",
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
      id: "gitlabUsername",
      accessorFn: (row) => row.person.gitlabUsername ?? "",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="GitLab"
          className="hidden md:flex"
        />
      ),
      cell: ({ row }) => (
        <span className="hidden md:inline">
          {(row.getValue("gitlabUsername") as string) || (
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
        const member = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                router.push(
                  `/projects/${projectId}/team?editMember=${member.id}`,
                  {
                    scroll: false,
                  },
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
                  <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove &quot;{member.person.firstName}{" "}
                    {member.person.lastName}
                    &quot; from the project team.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteMutation.mutate({ id: member.id })}
                    disabled={deletingId === member.id}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {deletingId === member.id ? "Removing..." : "Remove"}
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
    <DataTable
      columns={columns}
      data={members}
      toolbar={(table) => (
        <DataTableToolbar
          table={table}
          searchColumn="name"
          searchPlaceholder="Filter members..."
        >
          {table.getColumn("titleName") && titleOptions.length > 0 && (
            <DataTableFacetedFilter
              column={table.getColumn("titleName")}
              title="Title"
              options={titleOptions}
            />
          )}
          {table.getColumn("departmentName") &&
            departmentOptions.length > 0 && (
              <DataTableFacetedFilter
                column={table.getColumn("departmentName")}
                title="Department"
                options={departmentOptions}
              />
            )}
        </DataTableToolbar>
      )}
    />
  );
}

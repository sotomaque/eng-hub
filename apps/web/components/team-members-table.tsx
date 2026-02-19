"use client";

import type { Role, Team, TeamMember, Title } from "@prisma/client";
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
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import type { TitleColorMap } from "@/lib/constants/team";
import { TITLE_NO_TITLE_COLOR } from "@/lib/constants/team";
import { useTRPC } from "@/lib/trpc/client";

type MemberWithRelations = TeamMember & {
  role: Role;
  team: Team | null;
  title: Title | null;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation(
    trpc.teamMember.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Team member removed");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeletingId(null),
    }),
  );

  const titleOptions = useMemo(() => {
    const titles = [
      ...new Set(members.map((m) => m.title?.name).filter(Boolean)),
    ];
    titles.sort();
    return titles.map((t) => ({ label: t as string, value: t as string }));
  }, [members]);

  const roleOptions = useMemo(() => {
    const roles = [...new Set(members.map((m) => m.role.name))];
    roles.sort();
    return roles.map((r) => ({ label: r, value: r }));
  }, [members]);

  const columns: ColumnDef<MemberWithRelations>[] = [
    {
      id: "name",
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue("name")}</span>
      ),
    },
    {
      accessorKey: "email",
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
      accessorFn: (row) => row.title?.name ?? "",
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
      id: "roleName",
      accessorFn: (row) => row.role.name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => <span>{row.getValue("roleName")}</span>,
      filterFn: (row, id, value: string[]) => {
        return value.includes(row.getValue(id) as string);
      },
    },
    {
      accessorKey: "githubUsername",
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
      accessorKey: "gitlabUsername",
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
                router.push(`/projects/${projectId}?editMember=${member.id}`, {
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
                  <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove &quot;{member.firstName} {member.lastName}
                    &quot; from the project team.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setDeletingId(member.id);
                      deleteMutation.mutate({ id: member.id });
                    }}
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
          {table.getColumn("roleName") && roleOptions.length > 0 && (
            <DataTableFacetedFilter
              column={table.getColumn("roleName")}
              title="Role"
              options={roleOptions}
            />
          )}
        </DataTableToolbar>
      )}
    />
  );
}

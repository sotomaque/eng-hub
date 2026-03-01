"use client";

import type { Team, TeamMembership } from "@prisma/client";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { RollOffDialog } from "@/components/roll-off-dialog";
import type { TitleColorMap } from "@/lib/constants/team";
import { TITLE_NO_TITLE_COLOR } from "@/lib/constants/team";

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
    managerId: string | null;
    department: { name: string } | null;
    title: { name: string } | null;
  };
  teamMemberships: (TeamMembership & { team: Team })[];
};

type FilterOption = {
  label: string;
  value: string;
};

type TeamMembersTableProps = {
  projectId: string;
  members: MemberWithRelations[];
  allMembers?: MemberWithRelations[];
  titleColorMap: TitleColorMap;
  titleOptions?: FilterOption[];
  departmentOptions?: FilterOption[];
  filterTitle?: string[];
  filterDepartment?: string[];
  filterCount?: number;
  onFilterChange?: (key: "title" | "department", values: string[]) => void;
  onResetFilters?: () => void;
};

export function TeamMembersTable({
  projectId,
  members,
  allMembers,
  titleColorMap,
  titleOptions: titleOptionsProp,
  departmentOptions: departmentOptionsProp,
  filterTitle,
  filterDepartment,
  filterCount,
  onFilterChange,
  onResetFilters,
}: TeamMembersTableProps) {
  const router = useRouter();
  const [rollOffMember, setRollOffMember] = useState<MemberWithRelations | null>(null);

  // Use prop-provided options (from unfiltered data) or derive locally as fallback
  const titleOptions = useMemo(() => {
    if (titleOptionsProp) return titleOptionsProp;
    const titles = [...new Set(members.map((m) => m.person.title?.name).filter(Boolean))];
    titles.sort();
    return titles.map((t) => ({ label: t as string, value: t as string }));
  }, [titleOptionsProp, members]);

  const departmentOptions = useMemo(() => {
    if (departmentOptionsProp) return departmentOptionsProp;
    const depts = [
      ...new Set(members.map((m) => m.person.department?.name).filter(Boolean) as string[]),
    ];
    depts.sort();
    return depts.map((d) => ({ label: d, value: d }));
  }, [departmentOptionsProp, members]);

  const columns: ColumnDef<MemberWithRelations>[] = useMemo(
    () => [
      {
        id: "name",
        accessorFn: (row) =>
          `${row.person.firstName}${row.person.callsign ? ` ${row.person.callsign}` : ""} ${row.person.lastName}`,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
        enableHiding: false,
        cell: ({ row }) => {
          const member = row.original;
          return (
            <Link
              href={`/people/${member.personId}`}
              className="flex items-center gap-2 hover:underline"
              onMouseEnter={() => router.prefetch(`/people/${member.personId}`)}
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
          <DataTableColumnHeader column={column} title="Email" className="hidden sm:flex" />
        ),
        cell: ({ row }) => (
          <span className="hidden text-muted-foreground sm:inline">{row.getValue("email")}</span>
        ),
      },
      {
        id: "titleName",
        accessorFn: (row) => row.person.title?.name ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Title" className="hidden lg:flex" />
        ),
        cell: ({ row }) => {
          const val = row.getValue("titleName") as string;
          if (!val) {
            return <span className="text-muted-foreground hidden lg:inline">{"\u2014"}</span>;
          }
          const color = titleColorMap.get(val) ?? TITLE_NO_TITLE_COLOR;
          return (
            <span className="hidden lg:inline">
              <Badge className="border-0 text-white" style={{ backgroundColor: color }}>
                {val}
              </Badge>
            </span>
          );
        },
      },
      {
        id: "departmentName",
        accessorFn: (row) => row.person.department?.name ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title="Department" />,
        cell: ({ row }) => {
          const val = row.getValue("departmentName") as string;
          return val ? (
            <span>{val}</span>
          ) : (
            <span className="text-muted-foreground">{"\u2014"}</span>
          );
        },
      },
      {
        id: "githubUsername",
        accessorFn: (row) => row.person.githubUsername ?? "",
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
        id: "gitlabUsername",
        accessorFn: (row) => row.person.gitlabUsername ?? "",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="GitLab" className="hidden md:flex" />
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
                  router.push(`/projects/${projectId}/team?editMember=${member.id}`, {
                    scroll: false,
                  })
                }
              >
                <Pencil className="size-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setRollOffMember(member)}>
                <Trash2 className="size-4" />
                <span className="sr-only">Roll off</span>
              </Button>
            </div>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [titleColorMap, projectId, router],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={members}
        toolbar={(table) => (
          <DataTableToolbar
            table={table}
            searchColumn="name"
            searchPlaceholder="Filter members…"
            filterCount={filterCount}
            onResetFilters={onResetFilters}
          >
            {titleOptions.length > 0 && (
              <DataTableFacetedFilter
                title="Title"
                options={titleOptions}
                {...(onFilterChange
                  ? {
                      value: filterTitle ?? [],
                      onValueChange: (v) => onFilterChange("title", v),
                    }
                  : { column: table.getColumn("titleName") })}
              />
            )}
            {departmentOptions.length > 0 && (
              <DataTableFacetedFilter
                title="Department"
                options={departmentOptions}
                {...(onFilterChange
                  ? {
                      value: filterDepartment ?? [],
                      onValueChange: (v) => onFilterChange("department", v),
                    }
                  : { column: table.getColumn("departmentName") })}
              />
            )}
            <DataTableViewOptions
              table={table}
              columnLabels={{
                email: "Email",
                titleName: "Title",
                departmentName: "Department",
                githubUsername: "GitHub",
                gitlabUsername: "GitLab",
              }}
            />
          </DataTableToolbar>
        )}
      />
      {rollOffMember && (
        <RollOffDialog
          open={!!rollOffMember}
          onOpenChange={(open) => {
            if (!open) setRollOffMember(null);
          }}
          member={rollOffMember}
          allMembers={allMembers ?? members}
          onSuccess={() => {
            setRollOffMember(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

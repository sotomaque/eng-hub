"use client";

import type { Role, Team, TeamMember, Title } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
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
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Pencil, Plus, Settings, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

type MemberWithRelations = TeamMember & {
  role: Role;
  team: Team | null;
  title: Title | null;
};

interface TeamSectionProps {
  projectId: string;
  members: MemberWithRelations[];
  teams: Team[];
}

export function TeamSection({ projectId, members, teams }: TeamSectionProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation(
    trpc.teamMember.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Team member removed");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
      onSettled: () => setDeletingId(null),
    }),
  );

  function handleAdd() {
    router.push(`/projects/${projectId}?addMember=true`, { scroll: false });
  }

  function handleEdit(id: string) {
    router.push(`/projects/${projectId}?editMember=${id}`, { scroll: false });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    deleteMutation.mutate({ id });
  }

  const arrangementsUrl = `/projects/${projectId}/teams`;

  const hasTeams = teams.length > 0;

  // Group members by team
  const membersByTeam = new Map<string | null, MemberWithRelations[]>();
  for (const member of members) {
    const key = member.teamId;
    const group = membersByTeam.get(key) ?? [];
    group.push(member);
    membersByTeam.set(key, group);
  }

  // Order: teams alphabetically, then unassigned at the end
  const orderedGroups: { team: Team | null; members: MemberWithRelations[] }[] =
    [];
  for (const team of teams) {
    const teamMembers = membersByTeam.get(team.id);
    if (teamMembers) {
      orderedGroups.push({ team, members: teamMembers });
    }
  }
  const unassigned = membersByTeam.get(null);
  if (unassigned) {
    orderedGroups.push({ team: null, members: unassigned });
  }

  function renderMemberRow(member: MemberWithRelations) {
    return (
      <TableRow key={member.id}>
        <TableCell className="font-medium">{member.firstName} {member.lastName}</TableCell>
        <TableCell className="hidden sm:table-cell">{member.email}</TableCell>
        <TableCell className="hidden lg:table-cell">
          {member.title?.name || <span className="text-muted-foreground">—</span>}
        </TableCell>
        <TableCell>{member.role.name}</TableCell>
        <TableCell className="hidden md:table-cell">
          {member.githubUsername || (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {member.gitlabUsername || (
            <span className="text-muted-foreground">—</span>
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(member.id)}
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
                    This will remove &quot;{member.firstName} {member.lastName}&quot; from the project
                    team.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(member.id)}
                    disabled={deletingId === member.id}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {deletingId === member.id ? "Removing..." : "Remove"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  function renderTableHeader() {
    return (
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead className="hidden sm:table-cell">Email</TableHead>
          <TableHead className="hidden lg:table-cell">Title</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="hidden md:table-cell">GitHub</TableHead>
          <TableHead className="hidden md:table-cell">GitLab</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Team</CardTitle>
            <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
              {members.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={arrangementsUrl}>
              <Button size="sm" variant="outline">
                <Settings className="size-4" />
                <span className="hidden sm:inline">Manage Arrangements</span>
              </Button>
            </Link>
            <Button onClick={handleAdd} size="sm">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Member</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="text-muted-foreground mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              No team members yet. Add members to track your project team.
            </p>
          </div>
        ) : hasTeams ? (
          <div className="space-y-6">
            {orderedGroups.map((group) => (
              <div key={group.team?.id ?? "unassigned"}>
                <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                  {group.team?.name ?? "Unassigned"}
                </h4>
                <div className="rounded-md border">
                  <Table>
                    {renderTableHeader()}
                    <TableBody>{group.members.map(renderMemberRow)}</TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              {renderTableHeader()}
              <TableBody>{members.map(renderMemberRow)}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

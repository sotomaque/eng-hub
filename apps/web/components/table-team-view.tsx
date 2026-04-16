"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Pencil, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EditMemberTeamsDialog } from "@/components/edit-member-teams-dialog";
import { TeamCompositionBar } from "@/components/team-composition-bar";
import type { TitleColorMap } from "@/lib/constants/team";
import { useTRPC } from "@/lib/trpc/client";

type MemberData = {
  id: string;
  personId: string;
  person: {
    firstName: string;
    lastName: string;
    callsign: string | null;
    department: { name: string; color: string | null } | null;
    title: { name: string } | null;
  };
};

type AssignmentData = {
  teamMember: MemberData;
};

type TeamData = {
  id: string;
  name: string;
  assignments: AssignmentData[];
};

type TableTeamViewProps = {
  arrangementId: string;
  teams: TeamData[];
  unassignedMembers: MemberData[];
  onRenameTeam: (teamId: string, name: string) => void;
  onDeleteTeam: (teamId: string) => void;
  titleColorMap: TitleColorMap;
};

export function TableTeamView({
  arrangementId,
  teams,
  unassignedMembers,
  onRenameTeam,
  onDeleteTeam,
  titleColorMap,
}: TableTeamViewProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [editingMember, setEditingMember] = useState<{
    id: string;
    displayName: string;
    currentTeamIds: string[];
  } | null>(null);

  const arrangementTeamList = useMemo(
    () => teams.map((t) => ({ id: t.id, name: t.name })),
    [teams],
  );

  function openEditDialog(member: MemberData) {
    const displayName = `${member.person.firstName}${member.person.callsign ? ` ${member.person.callsign}` : ""} ${member.person.lastName}`;
    const currentTeamIds = teams
      .filter((t) => t.assignments.some((a) => a.teamMember.id === member.id))
      .map((t) => t.id);
    setEditingMember({ id: member.id, displayName, currentTeamIds });
  }

  const assignMutation = useMutation(
    trpc.arrangement.assignMember.mutationOptions({
      onSuccess: () => router.refresh(),
      onError: (error) => toast.error(error.message),
    }),
  );

  const unassignMutation = useMutation(
    trpc.arrangement.unassignMember.mutationOptions({
      onSuccess: () => router.refresh(),
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleAssign(memberId: string, teamId: string) {
    assignMutation.mutate({
      arrangementTeamId: teamId,
      teamMemberId: memberId,
    });
  }

  function handleUnassign(memberId: string, teamId: string) {
    unassignMutation.mutate({
      teamMemberId: memberId,
      arrangementTeamId: teamId,
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Unassigned members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Unassigned Members ({unassignedMembers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {unassignedMembers.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              All members are assigned
            </p>
          ) : (
            <div className="space-y-2">
              {unassignedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/people/${member.personId}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {member.person.firstName}
                      {member.person.callsign ? ` ${member.person.callsign}` : ""}{" "}
                      {member.person.lastName}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {member.person.department?.name ?? "—"}
                      {member.person.title ? ` · ${member.person.title.name}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Select onValueChange={(teamId) => handleAssign(member.id, teamId)}>
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue placeholder="Assign to…" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEditDialog(member)}
                      title="Edit teams"
                    >
                      <Users className="size-3.5" />
                      <span className="sr-only">Edit teams</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams */}
      <div className="space-y-4">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  {team.name} ({team.assignments.length})
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => {
                      const name = prompt("New team name:", team.name);
                      if (name?.trim()) onRenameTeam(team.id, name.trim());
                    }}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    onClick={() => onDeleteTeam(team.id)}
                  >
                    <Trash2 className="size-3" />
                  </Button>
                </div>
              </div>
              {team.assignments.length > 0 && (
                <TeamCompositionBar
                  members={team.assignments.map((a) => ({
                    title: a.teamMember.person.title,
                  }))}
                  titleColorMap={titleColorMap}
                  className="mt-2"
                />
              )}
            </CardHeader>
            <CardContent>
              {team.assignments.length === 0 ? (
                <p className="text-muted-foreground py-2 text-center text-xs">
                  No members assigned
                </p>
              ) : (
                <div className="space-y-1">
                  {team.assignments.map((a) => (
                    <div
                      key={a.teamMember.id}
                      className="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/people/${a.teamMember.personId}`}
                          className="text-sm hover:underline"
                        >
                          {a.teamMember.person.firstName}
                          {a.teamMember.person.callsign ? ` ${a.teamMember.person.callsign}` : ""}{" "}
                          {a.teamMember.person.lastName}
                        </Link>
                        {a.teamMember.person.department && (
                          <span className="text-muted-foreground ml-2 text-xs">
                            {a.teamMember.person.department.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => openEditDialog(a.teamMember)}
                          title="Edit teams"
                        >
                          <Users className="size-3" />
                          <span className="sr-only">Edit teams</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          onClick={() => handleUnassign(a.teamMember.id, team.id)}
                        >
                          <X className="size-3" />
                          <span className="sr-only">Unassign</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {teams.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No teams created yet. Add a team above to get started.
          </p>
        )}
      </div>

      {editingMember && (
        <EditMemberTeamsDialog
          open={true}
          onOpenChange={(next) => {
            if (!next) setEditingMember(null);
          }}
          arrangementId={arrangementId}
          teamMemberId={editingMember.id}
          memberDisplayName={editingMember.displayName}
          arrangementTeams={arrangementTeamList}
          currentArrangementTeamIds={editingMember.currentTeamIds}
          onSuccess={() => {
            setEditingMember(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

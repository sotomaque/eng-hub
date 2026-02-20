"use client";

import type { Team, TeamMembership } from "@prisma/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Pencil, Plus, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { TeamCompositionBar } from "@/components/team-composition-bar";
import { TeamMembersTable } from "@/components/team-members-table";
import { buildTitleColorMap } from "@/lib/constants/team";

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
    title: { name: string; sortOrder: number } | null;
  };
  teamMemberships: (TeamMembership & { team: Team })[];
};

interface TeamSectionProps {
  projectId: string;
  members: MemberWithRelations[];
  teams: Team[];
}

export function TeamSection({ projectId, members, teams }: TeamSectionProps) {
  const router = useRouter();
  const hasTeams = teams.length > 0;
  const [search, setSearch] = useState("");

  const titleColorMap = useMemo(() => {
    const titles = members
      .map((m) => m.person.title)
      .filter((t): t is { name: string; sortOrder: number } => t != null);
    return buildTitleColorMap(titles);
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!search) return members;
    const q = search.toLowerCase();
    return members.filter((m) => {
      const name =
        `${m.person.firstName}${m.person.callsign ? ` ${m.person.callsign}` : ""} ${m.person.lastName}`.toLowerCase();
      return (
        name.includes(q) ||
        m.person.email.toLowerCase().includes(q) ||
        (m.person.department?.name ?? "").toLowerCase().includes(q) ||
        (m.person.title?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [members, search]);

  // Group members by team (a member can appear under multiple teams)
  const orderedGroups = useMemo(() => {
    const membersByTeam = new Map<string, MemberWithRelations[]>();
    const assignedMemberIds = new Set<string>();

    for (const member of filteredMembers) {
      for (const membership of member.teamMemberships) {
        assignedMemberIds.add(member.id);
        const group = membersByTeam.get(membership.teamId) ?? [];
        group.push(member);
        membersByTeam.set(membership.teamId, group);
      }
    }

    const groups: { team: Team | null; members: MemberWithRelations[] }[] = [];
    for (const team of teams) {
      const teamMembers = membersByTeam.get(team.id);
      if (teamMembers) {
        groups.push({ team, members: teamMembers });
      }
    }
    const unassigned = filteredMembers.filter(
      (m) => !assignedMemberIds.has(m.id),
    );
    if (unassigned.length > 0) {
      groups.push({ team: null, members: unassigned });
    }
    return groups;
  }, [filteredMembers, teams]);

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
            <Button
              onClick={() =>
                router.push(`/projects/${projectId}/team?manageTeams=true`, {
                  scroll: false,
                })
              }
              size="sm"
              variant="outline"
            >
              <Users className="size-4" />
              <span className="hidden sm:inline">Manage Teams</span>
            </Button>
            <Button
              onClick={() =>
                router.push(`/projects/${projectId}/team?addMember=true`, {
                  scroll: false,
                })
              }
              size="sm"
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">Add Member</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      {members.length > 0 && (
        <div className="px-6 pb-2">
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
            <Input
              placeholder="Search across all teams..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9"
            />
          </div>
        </div>
      )}
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
              <div key={group.team?.id ?? "unassigned"} className="space-y-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {group.team && (
                      <Avatar className="size-5 shrink-0 rounded-md">
                        <AvatarImage src={group.team.imageUrl ?? undefined} />
                        <AvatarFallback className="rounded-md text-[10px]">
                          {group.team.name[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <h4 className="text-sm font-medium">
                      {group.team?.name ?? "Unassigned"}
                    </h4>
                    <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                      {group.members.length}
                    </span>
                    {group.team && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() =>
                          router.push(
                            `/projects/${projectId}/team?editTeam=${group.team?.id}`,
                            { scroll: false },
                          )
                        }
                      >
                        <Pencil className="size-3" />
                        <span className="sr-only">Edit team</span>
                      </Button>
                    )}
                  </div>
                  <TeamCompositionBar
                    members={group.members.map((m) => ({
                      title: m.person.title,
                    }))}
                    titleColorMap={titleColorMap}
                  />
                </div>
                <TeamMembersTable
                  projectId={projectId}
                  members={group.members}
                  titleColorMap={titleColorMap}
                />
              </div>
            ))}
          </div>
        ) : (
          <TeamMembersTable
            projectId={projectId}
            members={members}
            titleColorMap={titleColorMap}
          />
        )}
      </CardContent>
    </Card>
  );
}

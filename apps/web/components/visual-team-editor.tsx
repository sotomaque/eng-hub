"use client";

import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DroppableTeamCard } from "@/components/droppable-team-card";
import { EditMemberTeamsDialog } from "@/components/edit-member-teams-dialog";
import { MemberPool } from "@/components/member-pool";
import type { TitleColorMap } from "@/lib/constants/team";
import { useTRPC } from "@/lib/trpc/client";

type MemberData = {
  id: string;
  person: {
    firstName: string;
    lastName: string;
    callsign: string | null;
    imageUrl?: string | null;
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

type VisualTeamEditorProps = {
  arrangementId: string;
  teams: TeamData[];
  unassignedMembers: MemberData[];
  onRenameTeam: (teamId: string, name: string) => void;
  onDeleteTeam: (teamId: string) => void;
  titleColorMap: TitleColorMap;
};

const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 5 } } as const;

export function VisualTeamEditor({
  arrangementId,
  teams,
  unassignedMembers,
  onRenameTeam,
  onDeleteTeam,
  titleColorMap,
}: VisualTeamEditorProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [activeMember, setActiveMember] = useState<{
    id: string;
    displayName: string;
  } | null>(null);
  const [editingMember, setEditingMember] = useState<{
    id: string;
    displayName: string;
    currentTeamIds: string[];
  } | null>(null);

  const arrangementTeamList = useMemo(
    () => teams.map((t) => ({ id: t.id, name: t.name })),
    [teams],
  );

  function openEditDialog(memberId: string, displayName: string) {
    const currentTeamIds = teams
      .filter((t) => t.assignments.some((a) => a.teamMember.id === memberId))
      .map((t) => t.id);
    setEditingMember({ id: memberId, displayName, currentTeamIds });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor),
  );

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

  const moveMutation = useMutation(
    trpc.arrangement.moveMember.mutationOptions({
      onSuccess: () => router.refresh(),
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleDragStart(event: DragStartEvent) {
    const { memberId, memberDisplayName } = event.active.data.current as {
      memberId: string;
      memberDisplayName: string;
    };
    setActiveMember({
      id: memberId,
      displayName: memberDisplayName,
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveMember(null);

    const { active, over } = event;
    if (!over) return;

    const { memberId, sourceTeamId } = active.data.current as {
      memberId: string;
      sourceTeamId: string | null;
    };

    const targetData = over.data.current as { teamId: string | null };
    const targetTeamId = targetData?.teamId ?? null;

    // Dropped on same location
    if (sourceTeamId === targetTeamId) return;

    if (targetTeamId === null && sourceTeamId) {
      // Drop onto unassigned pool = unassign
      unassignMutation.mutate({
        teamMemberId: memberId,
        arrangementTeamId: sourceTeamId,
      });
    } else if (targetTeamId && !sourceTeamId) {
      // Drop from pool to team = assign
      assignMutation.mutate({
        arrangementTeamId: targetTeamId,
        teamMemberId: memberId,
      });
    } else if (targetTeamId && sourceTeamId) {
      // Drop from team to team = move
      moveMutation.mutate({
        teamMemberId: memberId,
        fromTeamId: sourceTeamId,
        toTeamId: targetTeamId,
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4" style={{ minHeight: "60vh" }}>
        <div className="w-64 shrink-0">
          <MemberPool members={unassignedMembers} onMemberClick={openEditDialog} />
        </div>

        <div className="grid flex-1 auto-rows-min gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <DroppableTeamCard
              key={team.id}
              teamId={team.id}
              teamName={team.name}
              members={team.assignments.map((a) => a.teamMember)}
              onRename={onRenameTeam}
              onDelete={onDeleteTeam}
              onMemberClick={openEditDialog}
              titleColorMap={titleColorMap}
            />
          ))}

          {teams.length === 0 && (
            <div className="text-muted-foreground col-span-full flex items-center justify-center rounded-lg border border-dashed py-12 text-sm">
              Add a team to get started
            </div>
          )}
        </div>
      </div>

      <DragOverlay>
        {activeMember && (
          <div className="rounded-md border border-l-4 border-l-primary bg-background px-3 py-1.5 text-sm font-medium shadow-lg">
            {activeMember.displayName}
          </div>
        )}
      </DragOverlay>

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
    </DndContext>
  );
}

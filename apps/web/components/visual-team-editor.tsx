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
import type { Role } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DroppableTeamCard } from "@/components/droppable-team-card";
import { MemberPool } from "@/components/member-pool";
import type { TitleColorMap } from "@/lib/constants/team";
import { useTRPC } from "@/lib/trpc/client";

interface MemberData {
  id: string;
  firstName: string;
  lastName: string;
  title: { name: string } | null;
  role: Role;
}

interface AssignmentData {
  teamMember: MemberData;
}

interface TeamData {
  id: string;
  name: string;
  assignments: AssignmentData[];
}

interface VisualTeamEditorProps {
  teams: TeamData[];
  unassignedMembers: MemberData[];
  onRenameTeam: (teamId: string, name: string) => void;
  onDeleteTeam: (teamId: string) => void;
  titleColorMap: TitleColorMap;
}

export function VisualTeamEditor({
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
    firstName: string;
    lastName: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
    const { memberId, memberFirstName, memberLastName } = event.active.data
      .current as {
      memberId: string;
      memberFirstName: string;
      memberLastName: string;
    };
    setActiveMember({
      id: memberId,
      firstName: memberFirstName,
      lastName: memberLastName,
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
          <MemberPool members={unassignedMembers} />
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
            {activeMember.firstName} {activeMember.lastName}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Role } from "@prisma/client";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { DraggableMemberChip } from "@/components/draggable-member-chip";
import { TeamCompositionBar } from "@/components/team-composition-bar";
import type { TitleColorMap } from "@/lib/constants/team";

interface TeamMemberData {
  id: string;
  person: {
    firstName: string;
    lastName: string;
    imageUrl?: string | null;
  };
  title: { name: string } | null;
  role: Role;
}

interface DroppableTeamCardProps {
  teamId: string;
  teamName: string;
  members: TeamMemberData[];
  onRename: (teamId: string, name: string) => void;
  onDelete: (teamId: string) => void;
  titleColorMap: TitleColorMap;
}

export function DroppableTeamCard({
  teamId,
  teamName,
  members,
  onRename,
  onDelete,
  titleColorMap,
}: DroppableTeamCardProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `team-${teamId}`,
    data: { teamId },
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(teamName);

  function handleSave() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== teamName) {
      onRename(teamId, trimmed);
    }
    setIsEditing(false);
  }

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "transition-all",
        isOver && "ring-primary ring-2 ring-offset-2",
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          {isEditing ? (
            <div className="flex flex-1 items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="h-7 text-sm"
                autoFocus
              />
              <Button variant="ghost" size="icon" onClick={handleSave}>
                <Check className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(false)}
              >
                <X className="size-3" />
              </Button>
            </div>
          ) : (
            <>
              <CardTitle className="text-sm">{teamName}</CardTitle>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground mr-1 text-xs">
                  {members.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => {
                    setEditName(teamName);
                    setIsEditing(true);
                  }}
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => onDelete(teamId)}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      </CardHeader>
      {members.length > 0 && (
        <div className="px-6 pb-2">
          <TeamCompositionBar members={members} titleColorMap={titleColorMap} />
        </div>
      )}
      <CardContent>
        {members.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            Drag members here
          </p>
        ) : (
          <div className="space-y-1.5">
            {members.map((member) => (
              <DraggableMemberChip
                key={member.id}
                id={member.id}
                firstName={member.person.firstName}
                lastName={member.person.lastName}
                title={member.title}
                role={member.role}
                sourceTeamId={teamId}
                imageUrl={member.person.imageUrl}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

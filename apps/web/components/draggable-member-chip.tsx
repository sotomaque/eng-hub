"use client";

import { useDraggable } from "@dnd-kit/core";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

interface DraggableMemberChipProps {
  id: string;
  firstName: string;
  lastName: string;
  callsign?: string | null;
  title: { name: string } | null;
  department: { name: string; color: string | null } | null;
  sourceTeamId: string | null;
  imageUrl?: string | null;
}

export function DraggableMemberChip({
  id,
  firstName,
  lastName,
  callsign,
  title,
  department,
  sourceTeamId,
  imageUrl,
}: DraggableMemberChipProps) {
  const displayName = `${firstName}${callsign ? ` ${callsign}` : ""} ${lastName}`;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `member-${id}`,
    data: {
      memberId: id,
      memberDisplayName: displayName,
      sourceTeamId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border border-l-4 bg-background px-3 py-1.5 text-sm shadow-xs transition-opacity active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
      style={{ borderLeftColor: department?.color ?? "#9ca3af" }}
    >
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={imageUrl ?? undefined} />
        <AvatarFallback className="text-[10px]">
          {firstName[0]}
          {lastName[0]}
        </AvatarFallback>
      </Avatar>
      <span className="truncate font-medium">{displayName}</span>
      {title && (
        <span className="text-muted-foreground hidden truncate text-xs sm:inline">
          {title.name}
        </span>
      )}
      {department && (
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">{department.name}</span>
      )}
    </div>
  );
}

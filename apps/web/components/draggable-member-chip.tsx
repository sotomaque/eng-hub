"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Role } from "@prisma/client";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  Engineering: "border-l-blue-500",
  Design: "border-l-purple-500",
  Product: "border-l-green-500",
};

interface DraggableMemberChipProps {
  id: string;
  firstName: string;
  lastName: string;
  callsign?: string | null;
  title: { name: string } | null;
  role: Role | null;
  sourceTeamId: string | null;
  imageUrl?: string | null;
}

export function DraggableMemberChip({
  id,
  firstName,
  lastName,
  callsign,
  title,
  role,
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

  const borderColor =
    (role ? ROLE_COLORS[role.name] : undefined) ?? "border-l-gray-400";

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border border-l-4 bg-background px-3 py-1.5 text-sm shadow-xs transition-opacity active:cursor-grabbing",
        borderColor,
        isDragging && "opacity-50",
      )}
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
      {role && (
        <span className="text-muted-foreground ml-auto shrink-0 text-xs">
          {role.name}
        </span>
      )}
    </div>
  );
}

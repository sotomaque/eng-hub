"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Role } from "@prisma/client";
import { cn } from "@workspace/ui/lib/utils";

const ROLE_COLORS: Record<string, string> = {
  Engineering: "border-l-blue-500",
  Design: "border-l-purple-500",
  Product: "border-l-green-500",
};

interface DraggableMemberChipProps {
  id: string;
  name: string;
  title: string | null;
  role: Role;
  sourceTeamId: string | null;
}

export function DraggableMemberChip({
  id,
  name,
  title,
  role,
  sourceTeamId,
}: DraggableMemberChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `member-${id}`,
    data: { memberId: id, memberName: name, sourceTeamId },
  });

  const borderColor = ROLE_COLORS[role.name] ?? "border-l-gray-400";

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
      <span className="truncate font-medium">{name}</span>
      {title && (
        <span className="text-muted-foreground hidden truncate text-xs sm:inline">
          {title}
        </span>
      )}
      <span className="text-muted-foreground ml-auto shrink-0 text-xs">
        {role.name}
      </span>
    </div>
  );
}

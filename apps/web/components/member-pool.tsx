"use client";

import { useDroppable } from "@dnd-kit/core";
import type { Role } from "@prisma/client";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { useState } from "react";
import { DraggableMemberChip } from "@/components/draggable-member-chip";

interface MemberData {
  id: string;
  person: {
    firstName: string;
    lastName: string;
    callsign: string | null;
    imageUrl?: string | null;
    role: Role | null;
    title: { name: string } | null;
  };
}

interface MemberPoolProps {
  members: MemberData[];
}

export function MemberPool({ members }: MemberPoolProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: "unassigned-pool",
    data: { teamId: null },
  });

  const [search, setSearch] = useState("");

  const filtered = search
    ? members.filter(
        (m) =>
          `${m.person.firstName}${m.person.callsign ? ` ${m.person.callsign}` : ""} ${m.person.lastName}`
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (m.person.role?.name ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (m.person.title?.name ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()),
      )
    : members;

  // Group by role
  const byRole = new Map<string, MemberData[]>();
  for (const member of filtered) {
    const roleName = member.person.role?.name ?? "No Role";
    const group = byRole.get(roleName) ?? [];
    group.push(member);
    byRole.set(roleName, group);
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full flex-col rounded-lg border bg-muted/30 p-3",
        isOver && "ring-primary ring-2 ring-offset-2",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Unassigned{" "}
          <span className="text-muted-foreground font-normal">
            ({members.length})
          </span>
        </h3>
      </div>

      <Input
        placeholder="Search members..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-3 h-8 text-sm"
      />

      <div className="flex-1 space-y-4 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-xs">
            {members.length === 0
              ? "All members are assigned"
              : "No matches found"}
          </p>
        ) : (
          Array.from(byRole.entries()).map(([roleName, roleMembers]) => (
            <div key={roleName}>
              <h4 className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wider">
                {roleName}
              </h4>
              <div className="space-y-1.5">
                {roleMembers.map((member) => (
                  <DraggableMemberChip
                    key={member.id}
                    id={member.id}
                    firstName={member.person.firstName}
                    lastName={member.person.lastName}
                    callsign={member.person.callsign}
                    title={member.person.title}
                    role={member.person.role}
                    sourceTeamId={null}
                    imageUrl={member.person.imageUrl}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

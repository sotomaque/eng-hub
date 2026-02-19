"use client";

import type { Role, TeamMember } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { ArrowLeft, Check, Loader2, Plus, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActivateArrangementDialog } from "@/components/activate-arrangement-dialog";
import { TableTeamView } from "@/components/table-team-view";
import { VisualTeamEditor } from "@/components/visual-team-editor";
import { buildTitleColorMap } from "@/lib/constants/team";
import { useTRPC } from "@/lib/trpc/client";

type MemberWithRole = TeamMember & {
  role: Role;
  title: { name: string } | null;
};

interface AssignmentData {
  id: string;
  teamMember: MemberWithRole;
}

interface TeamData {
  id: string;
  name: string;
  sortOrder: number;
  assignments: AssignmentData[];
}

interface ArrangementData {
  id: string;
  name: string;
  isActive: boolean;
  projectId: string;
  teams: TeamData[];
  unassignedMembers: MemberWithRole[];
}

interface ArrangementEditorProps {
  projectId: string;
  arrangement: ArrangementData;
}

type ViewMode = "visual" | "table";

export function ArrangementEditor({
  projectId,
  arrangement,
}: ArrangementEditorProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [viewMode, setViewMode] = useState<ViewMode>("visual");
  const [newTeamName, setNewTeamName] = useState("");
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);

  const titleColorMap = useMemo(() => {
    const allMembers = [
      ...arrangement.unassignedMembers,
      ...arrangement.teams.flatMap((t) =>
        t.assignments.map((a) => a.teamMember),
      ),
    ];
    const titleNames = allMembers
      .map((m) => m.title?.name)
      .filter((n): n is string => n != null);
    return buildTitleColorMap(titleNames);
  }, [arrangement]);

  const totalMembers =
    arrangement.unassignedMembers.length +
    arrangement.teams.reduce((sum, t) => sum + t.assignments.length, 0);

  const assignedCount = arrangement.teams.reduce(
    (sum, t) => sum + t.assignments.length,
    0,
  );

  const addTeamMutation = useMutation(
    trpc.arrangement.addTeam.mutationOptions({
      onSuccess: () => {
        toast.success("Team added");
        setNewTeamName("");
        setIsAddingTeam(false);
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const renameTeamMutation = useMutation(
    trpc.arrangement.updateTeam.mutationOptions({
      onSuccess: () => {
        toast.success("Team renamed");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteTeamMutation = useMutation(
    trpc.arrangement.deleteTeam.mutationOptions({
      onSuccess: () => {
        toast.success("Team deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleAddTeam() {
    const trimmed = newTeamName.trim();
    if (!trimmed) return;
    addTeamMutation.mutate({ arrangementId: arrangement.id, name: trimmed });
  }

  function handleRenameTeam(teamId: string, name: string) {
    renameTeamMutation.mutate({ teamId, name });
  }

  function handleDeleteTeam(teamId: string) {
    deleteTeamMutation.mutate({ teamId });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}/teams`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
              <span className="sr-only">Back to arrangements</span>
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{arrangement.name}</h1>
              {arrangement.isActive && (
                <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  Active
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              {assignedCount} of {totalMembers} members assigned across{" "}
              {arrangement.teams.length}{" "}
              {arrangement.teams.length === 1 ? "team" : "teams"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border">
            <Button
              variant={viewMode === "visual" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("visual")}
              className="rounded-r-none"
            >
              Visual
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-l-none"
            >
              Table
            </Button>
          </div>

          {!arrangement.isActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActivateOpen(true)}
            >
              <Zap className="size-4" />
              Activate
            </Button>
          )}
        </div>
      </div>

      {/* Add team bar */}
      <div className="flex items-center gap-2">
        {isAddingTeam ? (
          <>
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTeam();
                if (e.key === "Escape") setIsAddingTeam(false);
              }}
              placeholder="Team name"
              className="max-w-xs"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleAddTeam}
              disabled={addTeamMutation.isPending}
            >
              {addTeamMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              Add
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingTeam(false);
                setNewTeamName("");
              }}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingTeam(true)}
          >
            <Plus className="size-4" />
            Add Team
          </Button>
        )}
      </div>

      {/* Editor */}
      {viewMode === "visual" ? (
        <VisualTeamEditor
          teams={arrangement.teams}
          unassignedMembers={arrangement.unassignedMembers}
          onRenameTeam={handleRenameTeam}
          onDeleteTeam={handleDeleteTeam}
          titleColorMap={titleColorMap}
        />
      ) : (
        <TableTeamView
          teams={arrangement.teams}
          unassignedMembers={arrangement.unassignedMembers}
          onRenameTeam={handleRenameTeam}
          onDeleteTeam={handleDeleteTeam}
          titleColorMap={titleColorMap}
        />
      )}

      <ActivateArrangementDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        arrangementId={arrangement.id}
        arrangementName={arrangement.name}
        teamCount={arrangement.teams.length}
        assignedCount={assignedCount}
      />
    </div>
  );
}

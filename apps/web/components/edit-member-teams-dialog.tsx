"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

type EditMemberTeamsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrangementId: string;
  teamMemberId: string;
  memberDisplayName: string;
  arrangementTeams: { id: string; name: string }[];
  currentArrangementTeamIds: string[];
  onSuccess?: () => void;
};

export function EditMemberTeamsDialog({
  open,
  onOpenChange,
  arrangementId,
  teamMemberId,
  memberDisplayName,
  arrangementTeams,
  currentArrangementTeamIds,
  onSuccess,
}: EditMemberTeamsDialogProps) {
  const trpc = useTRPC();
  const [selected, setSelected] = useState<string[]>(currentArrangementTeamIds);

  const mutation = useMutation(
    trpc.arrangement.setMemberAssignments.mutationOptions({
      onSuccess: () => {
        toast.success(`Updated teams for ${memberDisplayName}`);
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function toggle(teamId: string) {
    setSelected((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  }

  function handleSubmit() {
    mutation.mutate({
      arrangementId,
      teamMemberId,
      arrangementTeamIds: selected,
    });
  }

  function handleClose(nextOpen: boolean) {
    if (mutation.isPending) return;
    if (!nextOpen) setSelected(currentArrangementTeamIds);
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit teams for {memberDisplayName}</DialogTitle>
          <DialogDescription>
            Select one or more teams. Leave all unchecked to unassign from every team in this
            arrangement.
          </DialogDescription>
        </DialogHeader>

        {arrangementTeams.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            This arrangement has no teams yet. Add a team first.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {arrangementTeams.map((team) => {
              const isSelected = selected.includes(team.id);
              return (
                <Button
                  key={team.id}
                  type="button"
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggle(team.id)}
                  className="gap-1"
                  disabled={mutation.isPending}
                >
                  {isSelected && <Check className="size-3" />}
                  {team.name}
                </Button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

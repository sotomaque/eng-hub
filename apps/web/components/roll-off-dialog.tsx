"use client";

import type { Team, TeamMembership } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

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
    managerId: string | null;
    department: { name: string } | null;
    title: { name: string } | null;
  };
  teamMemberships: (TeamMembership & { team: Team })[];
};

type RollOffDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: MemberWithRelations;
  allMembers: MemberWithRelations[];
  onSuccess: () => void;
};

export function RollOffDialog({
  open,
  onOpenChange,
  member,
  allMembers,
  onSuccess,
}: RollOffDialogProps) {
  const trpc = useTRPC();
  const [newManagerId, setNewManagerId] = useState("");

  const directReports = allMembers.filter(
    (m) => m.person.managerId === member.personId && m.id !== member.id,
  );

  const managerCandidates = allMembers
    .filter((m) => m.personId !== member.personId)
    .map((m) => ({
      value: m.personId,
      label: `${m.person.firstName}${m.person.callsign ? ` "${m.person.callsign}"` : ""} ${m.person.lastName}`,
    }));

  const hasDirectReports = directReports.length > 0;

  const reassignMutation = useMutation(
    trpc.person.reassignReports.mutationOptions({
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.teamMember.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Team member rolled off");
        onOpenChange(false);
        setNewManagerId("");
        onSuccess();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isProcessing = reassignMutation.isPending || deleteMutation.isPending;

  async function handleReassignAndRollOff() {
    if (!newManagerId) return;
    await reassignMutation.mutateAsync({
      personIds: directReports.map((r) => r.personId),
      newManagerId,
    });
    deleteMutation.mutate({ id: member.id });
  }

  function handleSkipAndRollOff() {
    deleteMutation.mutate({ id: member.id });
  }

  function handleClose(nextOpen: boolean) {
    if (isProcessing) return;
    if (!nextOpen) setNewManagerId("");
    onOpenChange(nextOpen);
  }

  if (hasDirectReports) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Roll off team member?
            </DialogTitle>
            <DialogDescription>
              &quot;{member.person.firstName} {member.person.lastName}&quot; has{" "}
              {directReports.length} direct report
              {directReports.length > 1 ? "s" : ""} on this project. You can reassign them to a new
              manager before rolling off.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm font-medium">Direct reports</p>
            <div className="space-y-1.5">
              {directReports.map((report) => (
                <div key={report.id} className="flex items-center gap-2 text-sm">
                  <Avatar className="size-6">
                    <AvatarImage src={report.person.imageUrl ?? undefined} />
                    <AvatarFallback className="text-[10px]">
                      {report.person.firstName[0]}
                      {report.person.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {report.person.firstName} {report.person.lastName}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Reassign to</p>
            <Combobox
              options={managerCandidates}
              value={newManagerId}
              onValueChange={setNewManagerId}
              placeholder="Select new manager…"
              searchPlaceholder="Search people…"
              emptyMessage="No candidates found."
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleClose(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="ghost" onClick={handleSkipAndRollOff} disabled={isProcessing}>
              {isProcessing && !newManagerId ? <Loader2 className="animate-spin" /> : null}
              Skip &amp; Roll Off
            </Button>
            <Button
              onClick={handleReassignAndRollOff}
              disabled={!newManagerId || isProcessing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isProcessing && newManagerId ? <Loader2 className="animate-spin" /> : null}
              Reassign &amp; Roll Off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Roll off team member?</DialogTitle>
          <DialogDescription>
            &quot;{member.person.firstName} {member.person.lastName}&quot; will be removed from the
            active team but will still appear in stats if they have contributions.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSkipAndRollOff}
            disabled={isProcessing}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : null}
            Roll Off
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Combobox } from "@workspace/ui/components/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

type MarkAsDepartedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  person: { id: string; firstName: string; lastName: string };
  onSuccess?: () => void;
};

export function MarkAsDepartedDialog({
  open,
  onOpenChange,
  person,
  onSuccess,
}: MarkAsDepartedDialogProps) {
  const trpc = useTRPC();
  const [leftAt, setLeftAt] = useState<Date>(() => new Date());
  const [newManagerId, setNewManagerId] = useState("");

  const impactQuery = useQuery(
    trpc.person.getDepartureImpact.queryOptions({ id: person.id }, { enabled: open }),
  );
  const peopleQuery = useQuery(trpc.person.getAll.queryOptions(undefined, { enabled: open }));

  const directReports = impactQuery.data?.directReports ?? [];
  const ownedProjects = impactQuery.data?.ownedProjects ?? [];
  const hasDirectReports = directReports.length > 0;

  const managerCandidates = (peopleQuery.data ?? [])
    .filter((p) => p.id !== person.id && !directReports.some((r) => r.id === p.id))
    .map((p) => ({
      value: p.id,
      label: `${p.firstName}${p.callsign ? ` "${p.callsign}"` : ""} ${p.lastName}`,
    }));

  const reassignMutation = useMutation(
    trpc.person.reassignReports.mutationOptions({
      onError: (error) => toast.error(error.message),
    }),
  );

  const markAsDepartedMutation = useMutation(
    trpc.person.markAsDeparted.mutationOptions({
      onSuccess: () => {
        toast.success(`${person.firstName} ${person.lastName} marked as departed`);
        onOpenChange(false);
        setNewManagerId("");
        onSuccess?.();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isProcessing = reassignMutation.isPending || markAsDepartedMutation.isPending;
  const canSubmit = !hasDirectReports || Boolean(newManagerId);

  async function handleSubmit() {
    if (hasDirectReports) {
      if (!newManagerId) return;
      await reassignMutation.mutateAsync({
        personIds: directReports.map((r) => r.id),
        newManagerId,
      });
    }
    markAsDepartedMutation.mutate({ id: person.id, leftAt });
  }

  function handleClose(nextOpen: boolean) {
    if (isProcessing) return;
    if (!nextOpen) setNewManagerId("");
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Mark {person.firstName} {person.lastName} as departed?
          </DialogTitle>
          <DialogDescription>
            They will be removed from active team rosters on all projects. History (comments,
            reviews, goals) is preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="departure-date">Departure date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="departure-date"
                type="button"
                variant="outline"
                className={cn("w-full justify-start text-left font-normal")}
              >
                <CalendarIcon className="mr-2 size-4" />
                {format(leftAt, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={leftAt}
                onSelect={(date) => date && setLeftAt(date)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {hasDirectReports && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="space-y-3">
                <p className="font-medium">
                  {directReports.length} direct report{directReports.length > 1 ? "s" : ""} —
                  reassign before departure
                </p>
                <div className="space-y-1.5">
                  {directReports.map((report) => (
                    <div key={report.id} className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src={report.imageUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">
                          {report.firstName[0]}
                          {report.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {report.firstName} {report.lastName}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Reassign all reports to</Label>
                  <Combobox
                    options={managerCandidates}
                    value={newManagerId}
                    onValueChange={setNewManagerId}
                    placeholder="Select new manager…"
                    searchPlaceholder="Search people…"
                    emptyMessage="No candidates found."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {!hasDirectReports && ownedProjects.length > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">
                  Owns {ownedProjects.length} project{ownedProjects.length > 1 ? "s" : ""}
                </p>
                <p className="text-muted-foreground">
                  Ownership stays on{" "}
                  <span className="font-medium">{ownedProjects.map((p) => p.name).join(", ")}</span>
                  . Reassign ownership separately.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : null}
            Mark as departed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

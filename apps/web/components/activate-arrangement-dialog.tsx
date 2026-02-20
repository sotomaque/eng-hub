"use client";

import { useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

interface ActivateArrangementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arrangementId: string;
  arrangementName: string;
  teamCount: number;
  assignedCount: number;
}

export function ActivateArrangementDialog({
  open,
  onOpenChange,
  arrangementId,
  arrangementName,
  teamCount,
  assignedCount,
}: ActivateArrangementDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();

  const activateMutation = useMutation(
    trpc.arrangement.activate.mutationOptions({
      onSuccess: () => {
        toast.success("Configuration activated — live teams updated");
        onOpenChange(false);
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Activate &quot;{arrangementName}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will replace the current live team structure with the teams and
            assignments from this arrangement.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
          <p>
            <strong>{teamCount}</strong> {teamCount === 1 ? "team" : "teams"}{" "}
            will be created
          </p>
          <p>
            <strong>{assignedCount}</strong>{" "}
            {assignedCount === 1 ? "member" : "members"} will be assigned
          </p>
          <p className="text-muted-foreground text-xs">
            Existing live teams will be replaced. Members not in this
            arrangement will become unassigned.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => activateMutation.mutate({ id: arrangementId })}
            disabled={activateMutation.isPending}
          >
            {activateMutation.isPending ? "Activating..." : "Activate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

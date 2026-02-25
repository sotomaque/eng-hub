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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

type CloneSource = "empty" | "active" | "live";

type CreateArrangementDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeArrangement: { id: string; name: string } | null;
  hasLiveTeams: boolean;
};

export function CreateArrangementDialog({
  projectId,
  open,
  onOpenChange,
  activeArrangement,
  hasLiveTeams,
}: CreateArrangementDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [name, setName] = useState("");
  const [source, setSource] = useState<CloneSource>("empty");
  const createMutation = useMutation(
    trpc.arrangement.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Configuration created");
        onOpenChange(false);
        setName("");
        router.push(`/projects/${projectId}/arrangements/${data.id}`);
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const cloneMutation = useMutation(
    trpc.arrangement.clone.mutationOptions({
      onSuccess: (data) => {
        toast.success("Configuration cloned");
        onOpenChange(false);
        setName("");
        router.push(`/projects/${projectId}/arrangements/${data.id}`);
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const cloneFromLiveMutation = useMutation(
    trpc.arrangement.cloneFromLive.mutationOptions({
      onSuccess: (data) => {
        toast.success("Configuration created from live teams");
        onOpenChange(false);
        setName("");
        router.push(`/projects/${projectId}/arrangements/${data.id}`);
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting =
    createMutation.isPending || cloneMutation.isPending || cloneFromLiveMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    if (source === "active" && activeArrangement) {
      cloneMutation.mutate({
        sourceArrangementId: activeArrangement.id,
        name: trimmed,
      });
    } else if (source === "live") {
      cloneFromLiveMutation.mutate({ projectId, name: trimmed });
    } else {
      createMutation.mutate({ projectId, name: trimmed });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Team Configuration</DialogTitle>
          <DialogDescription>
            Create a new team configuration to organize members into sub-teams.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="arrangement-name">Name</Label>
            <Input
              id="arrangement-name"
              placeholder="Q3 Reorg Proposal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Starting point</Label>
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                <input
                  type="radio"
                  name="source"
                  value="empty"
                  checked={source === "empty"}
                  onChange={() => setSource("empty")}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">Start empty</p>
                  <p className="text-muted-foreground text-xs">Begin with all members unassigned</p>
                </div>
              </label>

              {activeArrangement && (
                <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <input
                    type="radio"
                    name="source"
                    value="active"
                    checked={source === "active"}
                    onChange={() => setSource("active")}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Clone active configuration</p>
                    <p className="text-muted-foreground text-xs">
                      Copy teams and assignments from &quot;
                      {activeArrangement.name}&quot;
                    </p>
                  </div>
                </label>
              )}

              {hasLiveTeams && (
                <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-accent">
                  <input
                    type="radio"
                    name="source"
                    value="live"
                    checked={source === "live"}
                    onChange={() => setSource("live")}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Clone from live teams</p>
                    <p className="text-muted-foreground text-xs">
                      Copy the current live team structure
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && (
                <span className="animate-spin">
                  <Loader2 />
                </span>
              )}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ArrowRight, CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

type TitleHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  personName: string;
};

export function TitleHistoryDialog({
  open,
  onOpenChange,
  personId,
  personName,
}: TitleHistoryDialogProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const historyQuery = useQuery(
    trpc.person.getTitleHistory.queryOptions({ personId }, { enabled: open }),
  );
  const titlesQuery = useQuery(trpc.title.getAll.queryOptions(undefined, { enabled: open }));

  const [newEffectiveAt, setNewEffectiveAt] = useState<Date>(() => new Date());
  const [newOldTitleId, setNewOldTitleId] = useState<string>("");
  const [newNewTitleId, setNewNewTitleId] = useState<string>("");

  const addMutation = useMutation(
    trpc.person.addTitleHistoryEntry.mutationOptions({
      onSuccess: () => {
        toast.success("Entry added");
        queryClient.invalidateQueries({
          queryKey: trpc.person.getTitleHistory.queryOptions({ personId }).queryKey,
        });
        setNewOldTitleId("");
        setNewNewTitleId("");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.person.deleteTitleHistoryEntry.mutationOptions({
      onSuccess: () => {
        toast.success("Entry deleted");
        queryClient.invalidateQueries({
          queryKey: trpc.person.getTitleHistory.queryOptions({ personId }).queryKey,
        });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const entries = historyQuery.data ?? [];
  const titles = titlesQuery.data ?? [];
  const titleOptions = [
    { value: "__none__", label: "— (no title)" },
    ...titles.map((t) => ({ value: t.id, label: t.name })),
  ];

  function handleAdd() {
    if (!newNewTitleId) {
      toast.error("Select a new title");
      return;
    }
    addMutation.mutate({
      personId,
      oldTitleId: newOldTitleId === "__none__" || !newOldTitleId ? null : newOldTitleId,
      newTitleId: newNewTitleId === "__none__" ? null : newNewTitleId,
      effectiveAt: newEffectiveAt,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Title history — {personName}</DialogTitle>
          <DialogDescription>
            Title changes are auto-logged whenever the current title is updated. You can add
            backfill entries here or delete incorrect ones.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing entries */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Existing entries
            </Label>
            {entries.length === 0 ? (
              <p className="text-muted-foreground text-sm">No title history yet.</p>
            ) : (
              <div className="space-y-1.5">
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs font-mono">
                        {format(new Date(entry.effectiveAt), "MMM d, yyyy")}
                      </span>
                      <span>{entry.oldTitle?.name ?? "—"}</span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="font-medium">{entry.newTitle?.name ?? "—"}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => deleteMutation.mutate({ id: entry.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Delete entry</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add new entry */}
          <div className="space-y-2 rounded-md border border-dashed p-3">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Add backfill entry
            </Label>
            <div className="grid grid-cols-[auto,1fr,auto,1fr] items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 size-3.5" />
                    {format(newEffectiveAt, "MMM d, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newEffectiveAt}
                    onSelect={(d) => d && setNewEffectiveAt(d)}
                  />
                </PopoverContent>
              </Popover>
              <Combobox
                options={titleOptions}
                value={newOldTitleId || "__none__"}
                onValueChange={setNewOldTitleId}
                placeholder="From title…"
                searchPlaceholder="Search titles…"
                emptyMessage="No titles."
              />
              <ArrowRight className="size-4 text-muted-foreground" />
              <Combobox
                options={titleOptions}
                value={newNewTitleId}
                onValueChange={setNewNewTitleId}
                placeholder="To title…"
                searchPlaceholder="Search titles…"
                emptyMessage="No titles."
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={addMutation.isPending || !newNewTitleId}
              className="gap-1.5"
            >
              {addMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              Add entry
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

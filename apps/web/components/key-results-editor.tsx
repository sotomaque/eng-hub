"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { STATUS_LABELS } from "@/lib/constants/roadmap";
import { useTRPC } from "@/lib/trpc/client";

type KeyResultData = {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  status: string;
  sortOrder: number;
};

type KeyResultsEditorProps = {
  keyResults: KeyResultData[];
  milestoneId?: string;
  quarterlyGoalId?: string;
  onChanged: () => void;
};

export function KeyResultsEditor({
  keyResults,
  milestoneId,
  quarterlyGoalId,
  onChanged,
}: KeyResultsEditorProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTarget, setNewTarget] = useState("");
  const [newUnit, setNewUnit] = useState("");

  const createMutation = useMutation(
    trpc.keyResult.create.mutationOptions({
      onSuccess: () => {
        toast.success("Key result added");
        setShowAddForm(false);
        setNewTitle("");
        setNewTarget("");
        setNewUnit("");
        onChanged();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.keyResult.update.mutationOptions({
      onSuccess: () => {
        onChanged();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.keyResult.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Key result removed");
        onChanged();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleAdd() {
    const target = Number.parseFloat(newTarget);
    if (!newTitle.trim() || Number.isNaN(target) || target <= 0) return;
    createMutation.mutate({
      title: newTitle.trim(),
      targetValue: target,
      unit: newUnit.trim() || undefined,
      milestoneId,
      quarterlyGoalId,
    });
  }

  function handleUpdateStatus(kr: KeyResultData, status: string) {
    updateMutation.mutate({
      id: kr.id,
      title: kr.title,
      targetValue: kr.targetValue,
      currentValue: kr.currentValue,
      unit: kr.unit ?? undefined,
      status: status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "AT_RISK",
    });
  }

  function handleUpdateCurrentValue(kr: KeyResultData, value: string) {
    const num = Number.parseFloat(value);
    if (Number.isNaN(num)) return;
    updateMutation.mutate({
      id: kr.id,
      title: kr.title,
      targetValue: kr.targetValue,
      currentValue: num,
      unit: kr.unit ?? undefined,
      status: kr.status as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "AT_RISK",
    });
  }

  const deletingId = deleteMutation.isPending ? (deleteMutation.variables?.id ?? null) : null;

  return (
    <div className="space-y-3">
      {keyResults.map((kr) => {
        const pct =
          kr.targetValue > 0
            ? Math.min(Math.round((kr.currentValue / kr.targetValue) * 100), 100)
            : 0;
        return (
          <div key={kr.id} className="space-y-1.5 rounded-md border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{kr.title}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6 shrink-0"
                onClick={() => deleteMutation.mutate({ id: kr.id })}
                disabled={deletingId === kr.id}
              >
                <Trash2 className="size-3" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-muted-foreground text-xs">
                {kr.currentValue}/{kr.targetValue}
                {kr.unit ? ` ${kr.unit}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="h-7 w-24 text-xs"
                defaultValue={kr.currentValue}
                onBlur={(e) => handleUpdateCurrentValue(kr, e.target.value)}
                placeholder="Current"
              />
              <Select value={kr.status} onValueChange={(v) => handleUpdateStatus(kr, v)}>
                <SelectTrigger className="h-7 flex-1 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      })}

      {showAddForm ? (
        <div className="space-y-2 rounded-md border border-dashed p-2.5">
          <Input
            placeholder="Key result title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Target value"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              className="h-8 text-sm"
            />
            <Input
              placeholder="Unit (optional)"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="h-8 w-28 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleAdd}
              disabled={createMutation.isPending || !newTitle.trim() || !newTarget}
            >
              Add
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setShowAddForm(true)}
          disabled={keyResults.length >= 5}
        >
          <Plus className="size-4" />
          {keyResults.length >= 5 ? "Maximum 5 key results" : "Add Key Result"}
        </Button>
      )}
    </div>
  );
}

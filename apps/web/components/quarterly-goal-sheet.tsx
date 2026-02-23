"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { KeyResultsEditor } from "@/components/key-results-editor";
import { PersonMultiSelect } from "@/components/person-multi-select";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreateQuarterlyGoalInput,
  createQuarterlyGoalSchema,
} from "@/lib/validations/quarterly-goal";

interface AssignmentPerson {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string | null;
  };
}

interface KeyResultData {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  status: string;
  sortOrder: number;
}

interface GoalData {
  id: string;
  title: string;
  description: string | null;
  quarter: string | null;
  targetDate: string | null;
  status: string;
  parentId: string | null;
  assignments: AssignmentPerson[];
  keyResults: KeyResultData[];
}

interface QuarterlyGoalSheetProps {
  projectId: string;
  goal?: GoalData;
  defaultParentId?: string;
}

export function QuarterlyGoalSheet({
  projectId,
  goal,
  defaultParentId,
}: QuarterlyGoalSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!goal;

  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    goal?.assignments.map((a) => a.person.id) ?? [],
  );
  const [keyResultsVersion, setKeyResultsVersion] = useState(0);
  const [createAnother, setCreateAnother] = useState(false);

  const goalsQuery = useQuery(
    trpc.quarterlyGoal.getByProjectId.queryOptions({ projectId }),
  );

  const parentOptions = (goalsQuery.data ?? [])
    .filter((g) => g.id !== goal?.id)
    .map((g) => ({ value: g.id, label: g.title }));

  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<CreateQuarterlyGoalInput>({
    resolver: zodResolver(createQuarterlyGoalSchema),
    defaultValues: {
      projectId,
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      quarter: goal?.quarter ?? "",
      targetDate: goal?.targetDate ? new Date(goal.targetDate) : undefined,
      status:
        (goal?.status as CreateQuarterlyGoalInput["status"]) ?? "NOT_STARTED",
      parentId: goal?.parentId ?? defaultParentId ?? null,
    },
  });

  const setAssigneesMutation = useMutation(
    trpc.quarterlyGoal.setAssignees.mutationOptions({
      onError: (error) => toast.error(error.message),
    }),
  );

  const createMutation = useMutation(
    trpc.quarterlyGoal.create.mutationOptions({
      onSuccess: async (data) => {
        if (assigneeIds.length > 0) {
          await setAssigneesMutation.mutateAsync({
            quarterlyGoalId: data.id,
            personIds: assigneeIds,
          });
        }
        toast.success("Quarterly goal created");
        if (createAnother) {
          const current = getValues();
          reset({
            projectId,
            title: "",
            description: "",
            quarter: current.quarter,
            targetDate: undefined,
            status: current.status,
            parentId: current.parentId,
          });
          setAssigneeIds([]);
          router.refresh();
        } else {
          handleClose();
          router.refresh();
        }
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.quarterlyGoal.update.mutationOptions({
      onSuccess: async () => {
        if (goal) {
          await setAssigneesMutation.mutateAsync({
            quarterlyGoalId: goal.id,
            personIds: assigneeIds,
          });
        }
        toast.success("Quarterly goal updated");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    const basePath = window.location.pathname;
    router.push(basePath, { scroll: false });
    reset();
  }

  function onSubmit(data: CreateQuarterlyGoalInput) {
    if (isEditing && goal) {
      const { projectId: _, ...rest } = data;
      updateMutation.mutate({ ...rest, id: goal.id });
    } else {
      createMutation.mutate(data);
    }
  }

  const handleKeyResultChanged = useCallback(() => {
    setKeyResultsVersion((v) => v + 1);
  }, []);

  const currentKeyResults =
    keyResultsVersion >= 0 ? (goal?.keyResults ?? []) : [];

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Quarterly Goal" : "Add Quarterly Goal"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the quarterly goal details."
              : "Add a new quarterly goal for this project."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Improve test coverage to 80%"
                {...register("title")}
                aria-invalid={!!errors.title}
              />
              {errors.title && (
                <p className="text-destructive text-sm">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this goal entail?"
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label>Quarter</Label>
              <Controller
                name="quarter"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? "" : val)
                    }
                    value={field.value || "__none__"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No quarter</SelectItem>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Target Date (optional)</Label>
              <Controller
                name="targetDate"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.value
                            ? format(field.value, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.value ? new Date(field.value) : undefined
                          }
                          onSelect={(date) => field.onChange(date ?? null)}
                        />
                      </PopoverContent>
                    </Popover>
                    {field.value && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => field.onChange(null)}
                      >
                        <X className="size-4" />
                        <span className="sr-only">Clear date</span>
                      </Button>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NOT_STARTED">Not Started</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="AT_RISK">At Risk</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {parentOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Parent Goal</Label>
                <Controller
                  name="parentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? null : val)
                      }
                      value={field.value ?? "__none__"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          None (top-level)
                        </SelectItem>
                        {parentOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <Label>Assignees</Label>
              <PersonMultiSelect
                value={assigneeIds}
                onChange={setAssigneeIds}
              />
            </div>

            {isEditing && goal && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Key Results</Label>
                  <KeyResultsEditor
                    keyResults={currentKeyResults}
                    quarterlyGoalId={goal.id}
                    onChanged={handleKeyResultChanged}
                  />
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            {!isEditing && (
              <label className="mr-auto flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={createAnother}
                  onChange={(e) => setCreateAnother(e.target.checked)}
                  className="size-4 rounded border-input accent-primary"
                />
                Create another
              </label>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (!isDirty &&
                  assigneeIds.length === (goal?.assignments.length ?? 0))
              }
            >
              {isSubmitting && (
                <span className="animate-spin">
                  <Loader2 />
                </span>
              )}
              {isEditing ? "Save Changes" : "Add Goal"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

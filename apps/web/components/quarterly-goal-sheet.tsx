"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { QuarterlyGoal } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
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
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreateQuarterlyGoalInput,
  createQuarterlyGoalSchema,
} from "@/lib/validations/quarterly-goal";

interface QuarterlyGoalSheetProps {
  projectId: string;
  goal?: QuarterlyGoal;
}

export function QuarterlyGoalSheet({
  projectId,
  goal,
}: QuarterlyGoalSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!goal;
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateQuarterlyGoalInput>({
    resolver: zodResolver(createQuarterlyGoalSchema),
    defaultValues: {
      projectId,
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      quarter: goal?.quarter ?? "",
      targetDate: goal?.targetDate ?? undefined,
      status: goal?.status ?? "NOT_STARTED",
    },
  });

  const createMutation = useMutation(
    trpc.quarterlyGoal.create.mutationOptions({
      onSuccess: () => {
        toast.success("Quarterly goal created");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.quarterlyGoal.update.mutationOptions({
      onSuccess: () => {
        toast.success("Quarterly goal updated");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    router.push(`/projects/${projectId}`, { scroll: false });
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

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent>
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
                      <SelectValue placeholder="Select quarter..." />
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
                      <SelectValue placeholder="Select status..." />
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
          </div>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Add Goal"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

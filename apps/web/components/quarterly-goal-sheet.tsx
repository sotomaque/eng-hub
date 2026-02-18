"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { QuarterlyGoal } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreateQuarterlyGoalInput,
  createQuarterlyGoalSchema,
} from "@/lib/validations/quarterly-goal";

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateQuarterlyGoalInput>({
    resolver: zodResolver(createQuarterlyGoalSchema),
    defaultValues: {
      projectId,
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      targetDate: goal?.targetDate
        ? (formatDateForInput(goal.targetDate) as unknown as Date)
        : ("" as unknown as Date),
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
      onSettled: () => setIsSubmitting(false),
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
      onSettled: () => setIsSubmitting(false),
    }),
  );

  function handleClose() {
    router.push(`/projects/${projectId}`, { scroll: false });
    reset();
  }

  function onSubmit(data: CreateQuarterlyGoalInput) {
    setIsSubmitting(true);
    if (isEditing && goal) {
      const { projectId: _, ...rest } = data;
      updateMutation.mutate({ ...rest, id: goal.id });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="overflow-y-auto">
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
          className="flex flex-col gap-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Improve test coverage to 80%"
              {...register("title")}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title.message}</p>
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
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              {...register("targetDate")}
              aria-invalid={!!errors.targetDate}
            />
            {errors.targetDate && (
              <p className="text-destructive text-sm">
                {errors.targetDate.message}
              </p>
            )}
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

          <SheetFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Add Goal"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Milestone } from "@prisma/client";
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
  type CreateMilestoneInput,
  createMilestoneSchema,
} from "@/lib/validations/milestone";

function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

interface MilestoneSheetProps {
  projectId: string;
  milestone?: Milestone;
}

export function MilestoneSheet({ projectId, milestone }: MilestoneSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!milestone;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMilestoneInput>({
    resolver: zodResolver(createMilestoneSchema),
    defaultValues: {
      projectId,
      title: milestone?.title ?? "",
      description: milestone?.description ?? "",
      targetDate: milestone?.targetDate
        ? (formatDateForInput(milestone.targetDate) as unknown as Date)
        : ("" as unknown as Date),
      status: milestone?.status ?? "NOT_STARTED",
    },
  });

  const createMutation = useMutation(
    trpc.milestone.create.mutationOptions({
      onSuccess: () => {
        toast.success("Milestone created");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setIsSubmitting(false),
    }),
  );

  const updateMutation = useMutation(
    trpc.milestone.update.mutationOptions({
      onSuccess: () => {
        toast.success("Milestone updated");
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

  function onSubmit(data: CreateMilestoneInput) {
    setIsSubmitting(true);
    if (isEditing && milestone) {
      const { projectId: _, ...rest } = data;
      updateMutation.mutate({ ...rest, id: milestone.id });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Milestone" : "Add Milestone"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the milestone details."
              : "Add a new milestone to track project progress."}
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
              placeholder="v2.0 Release"
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
              placeholder="What does this milestone include?"
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
              {isEditing ? "Save Changes" : "Add Milestone"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
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
import { z } from "zod";
import { useTRPC } from "@/lib/trpc/client";

const roadmapStatusEnum = z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "AT_RISK"]);

const goalFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: roadmapStatusEnum,
  targetDate: z.date().nullable().optional(),
  quarter: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

type PersonGoalData = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  quarter: string | null;
};

type PersonGoalSheetProps = {
  goal?: PersonGoalData;
};

export function PersonGoalSheet({ goal }: PersonGoalSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!goal;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: goal?.title ?? "",
      description: goal?.description ?? "",
      status: (goal?.status as GoalFormValues["status"]) ?? "NOT_STARTED",
      targetDate: goal?.targetDate ? new Date(goal.targetDate) : undefined,
      quarter: goal?.quarter ?? "",
    },
  });

  const createMutation = useMutation(
    trpc.personGoal.create.mutationOptions({
      onSuccess: () => {
        toast.success("Goal created");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.personGoal.update.mutationOptions({
      onSuccess: () => {
        toast.success("Goal updated");
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

  function onSubmit(data: GoalFormValues) {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      targetDate: data.targetDate ?? null,
      quarter: data.quarter || undefined,
    };

    if (isEditing && goal) {
      updateMutation.mutate({ ...payload, id: goal.id });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Goal" : "Add Goal"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update this goal." : "Add a new personal goal to track."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Ship the new onboarding flow"
                {...register("title")}
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this goal include?"
                {...register("description")}
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

            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter</Label>
              <Input id="quarter" placeholder="Q2 2026" {...register("quarter")} />
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
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
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
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isEditing && !isDirty)}>
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

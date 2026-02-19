"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
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
  type CreateStatusUpdateInput,
  createStatusUpdateSchema,
} from "@/lib/validations/status-update";

interface StatusUpdateSheetProps {
  projectId: string;
}

export function StatusUpdateSheet({ projectId }: StatusUpdateSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateStatusUpdateInput>({
    resolver: zodResolver(createStatusUpdateSchema),
    defaultValues: {
      projectId,
      status: undefined,
      description: "",
    },
  });

  const createMutation = useMutation(
    trpc.statusUpdate.create.mutationOptions({
      onSuccess: () => {
        toast.success("Status update added");
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

  function onSubmit(data: CreateStatusUpdateInput) {
    setIsSubmitting(true);
    createMutation.mutate(data);
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add Status Update</SheetTitle>
          <SheetDescription>
            Record the current health status of this project.
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
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
                      <SelectItem value="GREEN">Green — Healthy</SelectItem>
                      <SelectItem value="YELLOW">Yellow — At Risk</SelectItem>
                      <SelectItem value="RED">Red — Critical</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-destructive text-sm">
                  {errors.status.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="What's the current situation? Any course of action?"
                {...register("description")}
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
              Add Update
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

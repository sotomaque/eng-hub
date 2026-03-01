"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
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

const accomplishmentFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  date: z.date().nullable().optional(),
});

type AccomplishmentFormValues = z.infer<typeof accomplishmentFormSchema>;

type PersonAccomplishmentData = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
};

type PersonAccomplishmentSheetProps = {
  accomplishment?: PersonAccomplishmentData;
  personId?: string;
  onClose?: () => void;
  onSaved?: () => void;
};

export function PersonAccomplishmentSheet({
  accomplishment,
  personId,
  onClose,
  onSaved,
}: PersonAccomplishmentSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!accomplishment;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AccomplishmentFormValues>({
    resolver: zodResolver(accomplishmentFormSchema),
    defaultValues: {
      title: accomplishment?.title ?? "",
      description: accomplishment?.description ?? "",
      date: accomplishment?.date ? new Date(accomplishment.date) : undefined,
    },
  });

  const createMutation = useMutation(
    trpc.personAccomplishment.create.mutationOptions({
      onSuccess: () => {
        toast.success("Accomplishment logged");
        onSaved?.();
        handleClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.personAccomplishment.update.mutationOptions({
      onSuccess: () => {
        toast.success("Accomplishment updated");
        onSaved?.();
        handleClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    if (onClose) {
      onClose();
    } else {
      const basePath = window.location.pathname;
      router.push(basePath, { scroll: false });
    }
    reset();
  }

  function onSubmit(data: AccomplishmentFormValues) {
    const payload = {
      title: data.title,
      description: data.description || undefined,
      date: data.date ?? null,
    };

    if (isEditing && accomplishment) {
      updateMutation.mutate({ ...payload, id: accomplishment.id });
    } else {
      createMutation.mutate({ ...payload, personId });
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Accomplishment" : "Log a Win"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this accomplishment."
              : "Record something you accomplished or are proud of."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Launched the new API endpoint"
                {...register("title")}
                aria-invalid={!!errors.title}
              />
              {errors.title && <p className="text-destructive text-sm">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Any additional context or details…"
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label>Date (optional)</Label>
              <Controller
                name="date"
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
              {isEditing ? "Save Changes" : "Log Win"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

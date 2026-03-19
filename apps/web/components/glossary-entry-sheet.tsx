"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/lib/trpc/client";

const glossaryEntrySchema = z.object({
  term: z.string().min(1, "Term is required").max(200),
  definition: z.string().min(1, "Definition is required").max(2000),
});

type GlossaryEntryInput = z.infer<typeof glossaryEntrySchema>;

type GlossaryEntrySheetProps = {
  projectId: string;
  entry?: {
    id: string;
    term: string;
    definition: string;
  };
};

export function GlossaryEntrySheet({ projectId, entry }: GlossaryEntrySheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!entry;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<GlossaryEntryInput>({
    resolver: zodResolver(glossaryEntrySchema),
    defaultValues: {
      term: entry?.term ?? "",
      definition: entry?.definition ?? "",
    },
  });

  function handleClose() {
    reset();
    router.push(`/projects/${projectId}/glossary`, { scroll: false });
  }

  function handleError(error: { message: string }) {
    toast.error(error.message);
  }

  const createMutation = useMutation(
    trpc.glossary.create.mutationOptions({
      onSuccess: () => {
        toast.success("Entry added");
        handleClose();
        router.refresh();
      },
      onError: handleError,
    }),
  );

  const updateMutation = useMutation(
    trpc.glossary.update.mutationOptions({
      onSuccess: () => {
        toast.success("Entry updated");
        handleClose();
        router.refresh();
      },
      onError: handleError,
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function onSubmit(data: GlossaryEntryInput) {
    if (isEditing && entry) {
      updateMutation.mutate({ id: entry.id, ...data });
    } else {
      createMutation.mutate({ projectId, ...data });
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Entry" : "Add Entry"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update this glossary term." : "Add a new term to the project glossary."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="term">Term</Label>
              <Input
                id="term"
                placeholder="e.g. Sprint Velocity"
                {...register("term")}
                aria-invalid={!!errors.term}
              />
              {errors.term && <p className="text-destructive text-sm">{errors.term.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="definition">Definition</Label>
              <Textarea
                id="definition"
                placeholder="A clear, concise definition…"
                className="min-h-32 resize-none"
                {...register("definition")}
                aria-invalid={!!errors.definition}
              />
              {errors.definition && (
                <p className="text-destructive text-sm">{errors.definition.message}</p>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isDirty && isEditing)}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Add Entry"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

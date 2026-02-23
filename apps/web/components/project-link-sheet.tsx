"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ProjectLink } from "@prisma/client";
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
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreateProjectLinkInput,
  createProjectLinkSchema,
} from "@/lib/validations/project-link";

interface ProjectLinkSheetProps {
  projectId: string;
  link?: ProjectLink;
}

export function ProjectLinkSheet({ projectId, link }: ProjectLinkSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!link;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateProjectLinkInput>({
    resolver: zodResolver(createProjectLinkSchema),
    defaultValues: {
      projectId,
      label: link?.label ?? "",
      url: link?.url ?? "",
    },
  });

  const createMutation = useMutation(
    trpc.projectLink.create.mutationOptions({
      onSuccess: () => {
        toast.success("Link added");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.projectLink.update.mutationOptions({
      onSuccess: () => {
        toast.success("Link updated");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    router.push(`/projects/${projectId}/links`, { scroll: false });
    reset();
  }

  function onSubmit(data: CreateProjectLinkInput) {
    if (isEditing && link) {
      const { projectId: _, ...rest } = data;
      updateMutation.mutate({ ...rest, id: link.id });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Link" : "Add Link"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the link details."
              : "Add a helpful link for this project (Figma, docs, etc.)."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="Figma Designs"
                {...register("label")}
                aria-invalid={!!errors.label}
              />
              {errors.label && (
                <p className="text-destructive text-sm">
                  {errors.label.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://figma.com/…"
                {...register("url")}
                aria-invalid={!!errors.url}
              />
              {errors.url && (
                <p className="text-destructive text-sm">{errors.url.message}</p>
              )}
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
              {isEditing ? "Save Changes" : "Add Link"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Team } from "@prisma/client";
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";
import { useTRPC } from "@/lib/trpc/client";
import { type CreateTeamInput, createTeamSchema } from "@/lib/validations/team";

interface TeamEditSheetProps {
  projectId: string;
  team?: Team;
}

export function TeamEditSheet({ projectId, team }: TeamEditSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!team;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(
    team?.imageUrl ?? null,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      projectId,
      name: team?.name ?? "",
      description: team?.description ?? "",
    },
  });

  const createMutation = useMutation(
    trpc.team.create.mutationOptions({
      onSuccess: () => {
        toast.success("Team created");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setIsSubmitting(false),
    }),
  );

  const updateMutation = useMutation(
    trpc.team.update.mutationOptions({
      onSuccess: () => {
        toast.success("Team updated");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setIsSubmitting(false),
    }),
  );

  function handleClose() {
    router.push(`/projects/${projectId}/team`, { scroll: false });
    reset();
  }

  function onSubmit(data: CreateTeamInput) {
    setIsSubmitting(true);
    const withImage = { ...data, imageUrl: imageUrl || "" };
    if (isEditing && team) {
      const { projectId: _, ...rest } = withImage;
      updateMutation.mutate({ ...rest, id: team.id });
    } else {
      createMutation.mutate(withImage);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Team" : "Create Team"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the team details."
              : "Create a new team to organize members."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <ImageUploader
              label="Team Logo"
              currentImageUrl={imageUrl}
              onUploadComplete={(url) => setImageUrl(url)}
              onRemove={() => setImageUrl(null)}
              fallbackText={team?.name?.[0] ?? ""}
              shape="square"
            />

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Platform Team"
                {...register("name")}
                aria-invalid={!!errors.name}
              />
              {errors.name && (
                <p className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="What does this team focus on?"
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
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                (!isDirty && imageUrl === (team?.imageUrl ?? null))
              }
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Create Team"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

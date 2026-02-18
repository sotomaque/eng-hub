"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { TeamMember } from "@prisma/client";
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreateTeamMemberInput,
  createTeamMemberSchema,
} from "@/lib/validations/team-member";

interface TeamMemberSheetProps {
  projectId: string;
  member?: TeamMember;
}

export function TeamMemberSheet({ projectId, member }: TeamMemberSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!member;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTeamMemberInput>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: {
      projectId,
      name: member?.name ?? "",
      email: member?.email ?? "",
      role: member?.role ?? "",
      githubUsername: member?.githubUsername ?? "",
      gitlabUsername: member?.gitlabUsername ?? "",
    },
  });

  const createMutation = useMutation(
    trpc.teamMember.create.mutationOptions({
      onSuccess: () => {
        toast.success("Team member added");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setIsSubmitting(false),
    }),
  );

  const updateMutation = useMutation(
    trpc.teamMember.update.mutationOptions({
      onSuccess: () => {
        toast.success("Team member updated");
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

  function onSubmit(data: CreateTeamMemberInput) {
    setIsSubmitting(true);
    if (isEditing && member) {
      const { projectId: _, ...rest } = data;
      updateMutation.mutate({ ...rest, id: member.id });
    } else {
      createMutation.mutate(data);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Edit Team Member" : "Add Team Member"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the team member details."
              : "Add a new member to the project team."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 py-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Jane Smith"
              {...register("name")}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p className="text-destructive text-sm">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@company.com"
              {...register("email")}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              placeholder="Frontend Engineer"
              {...register("role")}
              aria-invalid={!!errors.role}
            />
            {errors.role && (
              <p className="text-destructive text-sm">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubUsername">GitHub Username</Label>
            <Input
              id="githubUsername"
              placeholder="janesmith"
              {...register("githubUsername")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gitlabUsername">GitLab Username</Label>
            <Input
              id="gitlabUsername"
              placeholder="janesmith"
              {...register("gitlabUsername")}
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
              {isEditing ? "Save Changes" : "Add Member"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

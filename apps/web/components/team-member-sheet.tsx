"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Role, Team, TeamMember, Title } from "@prisma/client";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreateTeamMemberInput,
  createTeamMemberSchema,
} from "@/lib/validations/team-member";

interface TeamMemberSheetProps {
  projectId: string;
  member?: TeamMember & { role: Role; team: Team | null; title: Title | null };
}

export function TeamMemberSheet({ projectId, member }: TeamMemberSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!member;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailManuallyEdited = useRef(isEditing);

  const rolesQuery = useQuery(trpc.role.getAll.queryOptions());
  const teamsQuery = useQuery(
    trpc.team.getByProjectId.queryOptions({ projectId }),
  );
  const titlesQuery = useQuery(trpc.title.getAll.queryOptions());

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTeamMemberInput>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: {
      projectId,
      firstName: member?.firstName ?? "",
      lastName: member?.lastName ?? "",
      email: member?.email ?? "",
      titleId: member?.titleId ?? "",
      roleId: member?.roleId ?? "",
      teamId: member?.teamId ?? "",
      githubUsername: member?.githubUsername ?? "",
      gitlabUsername: member?.gitlabUsername ?? "",
    },
  });

  const firstName = watch("firstName");
  const lastName = watch("lastName");

  useEffect(() => {
    if (emailManuallyEdited.current) return;
    if (firstName && lastName) {
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hypergiant.com`;
      setValue("email", email);
    }
  }, [firstName, lastName, setValue]);

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

  const roles = rolesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const titles = titlesQuery.data ?? [];

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="Jane"
                {...register("firstName")}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName && (
                <p className="text-destructive text-sm">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Smith"
                {...register("lastName")}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName && (
                <p className="text-destructive text-sm">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane.smith@hypergiant.com"
              {...register("email", {
                onChange: () => {
                  emailManuallyEdited.current = true;
                },
              })}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Controller
              name="titleId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(val) =>
                    field.onChange(val === "__none__" ? "" : val)
                  }
                  value={field.value || "__none__"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select title..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No title</SelectItem>
                    {titles.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() =>
                router.push(`/projects/${projectId}?manageTitles=true`, {
                  scroll: false,
                })
              }
            >
              Manage Titles
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.roleId && (
              <p className="text-destructive text-sm">
                {errors.roleId.message}
              </p>
            )}
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() =>
                router.push(`/projects/${projectId}?manageRoles=true`, {
                  scroll: false,
                })
              }
            >
              Manage Roles
            </Button>
          </div>

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Team</Label>
              <Controller
                name="teamId"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? "" : val)
                    }
                    value={field.value || "__none__"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No team (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No team</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

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

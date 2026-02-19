"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  Person,
  Role,
  Team,
  TeamMember,
  TeamMembership,
  Title,
} from "@prisma/client";
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
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreateTeamMemberInput,
  createTeamMemberSchema,
} from "@/lib/validations/team-member";

interface TeamMemberSheetProps {
  projectId: string;
  member?: TeamMember & {
    person: Person;
    role: Role;
    teamMemberships: (TeamMembership & { team: Team })[];
    title: Title | null;
  };
}

export function TeamMemberSheet({ projectId, member }: TeamMemberSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!member;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(
    member?.person.imageUrl ?? null,
  );
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
      firstName: member?.person.firstName ?? "",
      lastName: member?.person.lastName ?? "",
      email: member?.person.email ?? "",
      titleId: member?.titleId ?? "",
      roleId: member?.roleId ?? "",
      teamIds: member?.teamMemberships.map((m) => m.teamId) ?? [],
      githubUsername: member?.person.githubUsername ?? "",
      gitlabUsername: member?.person.gitlabUsername ?? "",
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
    router.push(`/projects/${projectId}/team`, { scroll: false });
    reset();
  }

  function onSubmit(data: CreateTeamMemberInput) {
    setIsSubmitting(true);
    const withImage = { ...data, imageUrl: imageUrl || "" };
    if (isEditing && member) {
      const { projectId: _, ...rest } = withImage;
      updateMutation.mutate({ ...rest, id: member.id });
    } else {
      createMutation.mutate(withImage);
    }
  }

  const roles = rolesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const titles = titlesQuery.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
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
          className="flex flex-col gap-4 px-4 py-4"
        >
          <ImageUploader
            label="Photo"
            currentImageUrl={imageUrl}
            onUploadComplete={(url) => setImageUrl(url)}
            onRemove={() => setImageUrl(null)}
            fallbackText={
              member
                ? `${member.person.firstName[0]}${member.person.lastName[0]}`
                : ""
            }
            shape="circle"
          />

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
                router.push(`/projects/${projectId}/team?manageTitles=true`, {
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
                router.push(`/projects/${projectId}/team?manageRoles=true`, {
                  scroll: false,
                })
              }
            >
              Manage Roles
            </Button>
          </div>

          {teams.length > 0 && (
            <div className="space-y-2">
              <Label>Teams</Label>
              <Controller
                name="teamIds"
                control={control}
                render={({ field }) => {
                  const selected = field.value ?? [];
                  const toggle = (teamId: string) => {
                    const next = selected.includes(teamId)
                      ? selected.filter((id) => id !== teamId)
                      : [...selected, teamId];
                    field.onChange(next);
                  };
                  return (
                    <div className="flex flex-wrap gap-2">
                      {teams.map((team) => {
                        const isSelected = selected.includes(team.id);
                        return (
                          <Button
                            key={team.id}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggle(team.id)}
                            className="gap-1"
                          >
                            {isSelected && <Check className="size-3" />}
                            {team.name}
                          </Button>
                        );
                      })}
                    </div>
                  );
                }}
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

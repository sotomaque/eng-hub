"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Team, TeamMembership } from "@prisma/client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
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
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";
import { useTRPC } from "@/lib/trpc/client";
import { type CreateTeamMemberInput, createTeamMemberSchema } from "@/lib/validations/team-member";

type TeamMemberSheetProps = {
  projectId: string;
  member?: {
    id: string;
    personId: string;
    person: {
      firstName: string;
      lastName: string;
      callsign: string | null;
      email: string;
      imageUrl: string | null;
      githubUsername: string | null;
      gitlabUsername: string | null;
      managerId: string | null;
      department: { id: string; name: string } | null;
      title: { id: string; name: string } | null;
    };
    teamMemberships: (TeamMembership & { team: Team })[];
  };
};

export function TeamMemberSheet({ projectId, member }: TeamMemberSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!member;
  const [imageUrl, setImageUrl] = useState<string | null>(member?.person.imageUrl ?? null);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const emailManuallyEdited = useRef(isEditing);
  const [selectedPersonId, setSelectedPersonId] = useState("");

  const departmentsQuery = useQuery(trpc.department.getAll.queryOptions());
  const teamsQuery = useQuery(trpc.team.getByProjectId.queryOptions({ projectId }));
  const titlesQuery = useQuery(trpc.title.getAll.queryOptions());
  const peopleQuery = useQuery(trpc.person.getAll.queryOptions());

  const departments = departmentsQuery.data ?? [];
  const teams = teamsQuery.data ?? [];
  const allTitles = titlesQuery.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CreateTeamMemberInput>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: {
      projectId,
      firstName: member?.person.firstName ?? "",
      lastName: member?.person.lastName ?? "",
      callsign: member?.person.callsign ?? "",
      email: member?.person.email ?? "",
      titleId: member?.person.title?.id ?? "",
      departmentId: member?.person.department?.id ?? "",
      teamIds: member?.teamMemberships.map((m) => m.teamId) ?? [],
      githubUsername: member?.person.githubUsername ?? "",
      gitlabUsername: member?.person.gitlabUsername ?? "",
      managerId: member?.person.managerId ?? "",
    },
  });

  const selectedDepartmentId = watch("departmentId");
  const filteredTitles = selectedDepartmentId
    ? allTitles.filter((t) => !t.departmentId || t.departmentId === selectedDepartmentId)
    : allTitles;

  function handleTitleChange(titleId: string) {
    setValue("titleId", titleId, { shouldDirty: true });
    const title = allTitles.find((t) => t.id === titleId);
    if (title?.departmentId) {
      setValue("departmentId", title.departmentId, { shouldDirty: true });
    }
  }

  function handleDepartmentChange(departmentId: string) {
    setValue("departmentId", departmentId, { shouldDirty: true });
    const currentTitleId = getValues("titleId");
    if (currentTitleId) {
      const currentTitle = allTitles.find((t) => t.id === currentTitleId);
      if (currentTitle?.departmentId && currentTitle.departmentId !== departmentId) {
        setValue("titleId", "", { shouldDirty: true });
      }
    }
  }

  function updateDerivedEmail() {
    if (emailManuallyEdited.current) return;
    const fn = getValues("firstName");
    const ln = getValues("lastName");
    if (fn && ln) {
      setValue("email", `${fn.toLowerCase()}.${ln.toLowerCase()}@hypergiant.com`);
    }
  }

  const createMutation = useMutation(
    trpc.teamMember.create.mutationOptions({
      onSuccess: () => {
        toast.success("Team member added");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
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
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    router.push(`/projects/${projectId}/team`, { scroll: false });
    reset();
  }

  function onSubmit(data: CreateTeamMemberInput) {
    const withImage = { ...data, imageUrl: imageUrl || "" };
    if (isEditing && member) {
      const { projectId: _, ...rest } = withImage;
      updateMutation.mutate({ ...rest, id: member.id });
    } else {
      createMutation.mutate(withImage);
    }
  }

  const allPeople = peopleQuery.data ?? [];
  const people = allPeople.filter((p) => !member || p.id !== member.personId);
  const availablePeople = allPeople.filter(
    (p) => !p.projectMemberships.some((m) => m.projectId === projectId && !m.leftAt),
  );

  function handlePersonSelect(personId: string) {
    setSelectedPersonId(personId);
    if (!personId) {
      reset({
        projectId,
        firstName: "",
        lastName: "",
        callsign: "",
        email: "",
        titleId: "",
        departmentId: "",
        teamIds: [],
        githubUsername: "",
        gitlabUsername: "",
        managerId: "",
      });
      emailManuallyEdited.current = false;
      setImageUrl(null);
      return;
    }
    const person = availablePeople.find((p) => p.id === personId);
    if (!person) return;
    setValue("firstName", person.firstName, { shouldDirty: true });
    setValue("lastName", person.lastName, { shouldDirty: true });
    setValue("callsign", person.callsign ?? "", { shouldDirty: true });
    setValue("email", person.email, { shouldDirty: true });
    setValue("githubUsername", person.githubUsername ?? "", {
      shouldDirty: true,
    });
    setValue("gitlabUsername", person.gitlabUsername ?? "", {
      shouldDirty: true,
    });
    setValue("managerId", person.managerId ?? "", { shouldDirty: true });
    if (person.departmentId) setValue("departmentId", person.departmentId, { shouldDirty: true });
    if (person.titleId) setValue("titleId", person.titleId, { shouldDirty: true });
    emailManuallyEdited.current = true;
    setImageUrl(person.imageUrl);
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Team Member" : "Add Team Member"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the team member details."
              : "Add a new member to the project team."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {!isEditing && (
              <div className="space-y-2">
                <Label>Existing Person</Label>
                <Combobox
                  options={availablePeople.map((p) => ({
                    value: p.id,
                    label: `${p.firstName}${p.callsign ? ` "${p.callsign}"` : ""} ${p.lastName}`,
                  }))}
                  value={selectedPersonId}
                  onValueChange={handlePersonSelect}
                  placeholder="Search existing people…"
                  searchPlaceholder="Search by name…"
                  emptyMessage="No people available."
                />
                <p className="text-muted-foreground text-xs">
                  Select an existing person, or fill in the details below to create a new one.
                </p>
              </div>
            )}

            <ImageUploader
              label="Photo"
              currentImageUrl={imageUrl}
              onUploadComplete={(url) => setImageUrl(url)}
              onRemove={() => setImageUrl(null)}
              onUploadingChange={setIsImageUploading}
              fallbackText={
                member ? `${member.person.firstName[0]}${member.person.lastName[0]}` : ""
              }
              shape="circle"
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Jane"
                  {...register("firstName", { onChange: updateDerivedEmail })}
                  aria-invalid={!!errors.firstName}
                  disabled={!!selectedPersonId}
                />
                {errors.firstName && (
                  <p className="text-destructive text-sm">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Smith"
                  {...register("lastName", { onChange: updateDerivedEmail })}
                  aria-invalid={!!errors.lastName}
                  disabled={!!selectedPersonId}
                />
                {errors.lastName && (
                  <p className="text-destructive text-sm">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="callsign">Preferred Name</Label>
              <Input
                id="callsign"
                placeholder="e.g. JJ, Bobby"
                {...register("callsign")}
                disabled={!!selectedPersonId}
              />
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
                disabled={!!selectedPersonId}
              />
              {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Controller
                name="titleId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={[
                      { value: "__none__", label: "No title" },
                      ...filteredTitles.map((t) => ({
                        value: t.id,
                        label: t.name,
                      })),
                    ]}
                    value={field.value || "__none__"}
                    onValueChange={(val) =>
                      val === "__none__" ? field.onChange("") : handleTitleChange(val)
                    }
                    placeholder="Select title…"
                    searchPlaceholder="Search titles…"
                  />
                )}
              />
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  const memberParam = isEditing ? `editMember=${member.id}` : "addMember=true";
                  router.push(`/projects/${projectId}/team?${memberParam}&manageTitles=true`, {
                    scroll: false,
                  });
                }}
              >
                Manage Titles
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={[
                      { value: "__none__", label: "No department" },
                      ...departments.map((d) => ({
                        value: d.id,
                        label: d.name,
                      })),
                    ]}
                    value={field.value || "__none__"}
                    onValueChange={(val) =>
                      val === "__none__" ? field.onChange("") : handleDepartmentChange(val)
                    }
                    placeholder="Select department…"
                    searchPlaceholder="Search departments…"
                  />
                )}
              />
              {errors.departmentId && (
                <p className="text-destructive text-sm">{errors.departmentId.message}</p>
              )}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={() => {
                  const memberParam = isEditing ? `editMember=${member.id}` : "addMember=true";
                  router.push(`/projects/${projectId}/team?${memberParam}&manageDepartments=true`, {
                    scroll: false,
                  });
                }}
              >
                Manage Departments
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Reports To</Label>
              <Controller
                name="managerId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={[
                      { value: "__none__", label: "No manager" },
                      ...people.map((p) => ({
                        value: p.id,
                        label: `${p.firstName}${p.callsign ? ` ${p.callsign}` : ""} ${p.lastName}`,
                      })),
                    ]}
                    value={field.value || "__none__"}
                    onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                    placeholder="Select manager…"
                    searchPlaceholder="Search people…"
                  />
                )}
              />
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
                disabled={!!selectedPersonId}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gitlabUsername">GitLab Username</Label>
              <Input
                id="gitlabUsername"
                placeholder="janesmith"
                {...register("gitlabUsername")}
                disabled={!!selectedPersonId}
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                isImageUploading ||
                (!isDirty && imageUrl === (member?.person.imageUrl ?? null))
              }
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Add Member"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { Project, Team, TeamMembership } from "@prisma/client";
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
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreatePersonInput,
  createPersonSchema,
} from "@/lib/validations/person";

type PersonWithMemberships = {
  id: string;
  firstName: string;
  lastName: string;
  callsign: string | null;
  email: string;
  imageUrl: string | null;
  githubUsername: string | null;
  gitlabUsername: string | null;
  managerId: string | null;
  departmentId: string | null;
  titleId: string | null;
  department: { id: string; name: string } | null;
  title: { id: string; name: string } | null;
  projectMemberships: {
    id: string;
    projectId: string;
    project: Project;
    teamMemberships: (TeamMembership & { team: Team })[];
  }[];
};

interface PersonSheetProps {
  person?: PersonWithMemberships;
}

export function PersonSheet({ person }: PersonSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!person;
  const [imageUrl, setImageUrl] = useState<string | null>(
    person?.imageUrl ?? null,
  );
  const emailManuallyEdited = useRef(isEditing);

  const peopleQuery = useQuery(trpc.person.getAll.queryOptions());
  const departmentsQuery = useQuery(trpc.department.getAll.queryOptions());
  const titlesQuery = useQuery(trpc.title.getAll.queryOptions());
  const people = (peopleQuery.data ?? []).filter(
    (p) => !person || p.id !== person.id,
  );
  const departments = departmentsQuery.data ?? [];
  const titles = titlesQuery.data ?? [];

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreatePersonInput>({
    resolver: zodResolver(createPersonSchema),
    defaultValues: {
      firstName: person?.firstName ?? "",
      lastName: person?.lastName ?? "",
      callsign: person?.callsign ?? "",
      email: person?.email ?? "",
      githubUsername: person?.githubUsername ?? "",
      gitlabUsername: person?.gitlabUsername ?? "",
      managerId: person?.managerId ?? "",
      departmentId: person?.departmentId ?? "",
      titleId: person?.titleId ?? "",
    },
  });

  function updateDerivedEmail() {
    if (emailManuallyEdited.current) return;
    const fn = getValues("firstName");
    const ln = getValues("lastName");
    if (fn && ln) {
      setValue(
        "email",
        `${fn.toLowerCase()}.${ln.toLowerCase()}@hypergiant.com`,
      );
    }
  }

  const createMutation = useMutation(
    trpc.person.create.mutationOptions({
      onSuccess: () => {
        toast.success("Person created");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.person.update.mutationOptions({
      onSuccess: () => {
        toast.success("Person updated");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    router.push("/people", { scroll: false });
    reset();
  }

  function onSubmit(data: CreatePersonInput) {
    const withImage = { ...data, imageUrl: imageUrl || "" };
    if (isEditing && person) {
      updateMutation.mutate({ ...withImage, id: person.id });
    } else {
      createMutation.mutate(withImage);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Person" : "Add Person"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this person's details."
              : "Add a new person to the directory."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <ImageUploader
              label="Photo"
              currentImageUrl={imageUrl}
              onUploadComplete={(url) => setImageUrl(url)}
              onRemove={() => setImageUrl(null)}
              fallbackText={
                person ? `${person.firstName[0]}${person.lastName[0]}` : ""
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
                  {...register("lastName", { onChange: updateDerivedEmail })}
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
              <Label htmlFor="callsign">Preferred Name</Label>
              <Input
                id="callsign"
                placeholder="e.g. JJ, Bobby"
                {...register("callsign")}
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
              />
              {errors.email && (
                <p className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
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
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? "" : val)
                    }
                    placeholder="Select manager…"
                    searchPlaceholder="Search people…"
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Controller
                  name="titleId"
                  control={control}
                  render={({ field }) => (
                    <Combobox
                      options={[
                        { value: "__none__", label: "No title" },
                        ...titles.map((t) => ({
                          value: t.id,
                          label: t.name,
                        })),
                      ]}
                      value={field.value || "__none__"}
                      onValueChange={(val) =>
                        field.onChange(val === "__none__" ? "" : val)
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
                    const personParam = isEditing
                      ? `edit=${person.id}`
                      : "create=true";
                    router.push(`/people?${personParam}&manageTitles=true`, {
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
                        field.onChange(val === "__none__" ? "" : val)
                      }
                      placeholder="Select department…"
                      searchPlaceholder="Search departments…"
                    />
                  )}
                />
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs"
                  onClick={() => {
                    const personParam = isEditing
                      ? `edit=${person.id}`
                      : "create=true";
                    router.push(
                      `/people?${personParam}&manageDepartments=true`,
                      {
                        scroll: false,
                      },
                    );
                  }}
                >
                  Manage Departments
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            {isEditing && person && (
              <div className="space-y-2">
                <Label>Projects</Label>
                {person.projectMemberships.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {person.projectMemberships.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                      >
                        {m.project.name}
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() =>
                    router.push(`/people?addToProject=${person.id}`, {
                      scroll: false,
                    })
                  }
                >
                  <Plus className="size-3" />
                  Add to project
                </Button>
              </div>
            )}
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
                (!isDirty && imageUrl === (person?.imageUrl ?? null))
              }
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Add Person"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

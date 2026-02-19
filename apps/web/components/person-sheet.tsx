"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type {
  Person,
  Project,
  Role,
  Team,
  TeamMember,
  TeamMembership,
  Title,
} from "@prisma/client";
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
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreatePersonInput,
  createPersonSchema,
} from "@/lib/validations/person";

type PersonWithMemberships = Person & {
  projectMemberships: (TeamMember & {
    project: Project;
    role: Role;
    title: Title | null;
    teamMemberships: (TeamMembership & { team: Team })[];
  })[];
};

interface PersonSheetProps {
  person?: PersonWithMemberships;
}

export function PersonSheet({ person }: PersonSheetProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEditing = !!person;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(
    person?.imageUrl ?? null,
  );
  const emailManuallyEdited = useRef(isEditing);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreatePersonInput>({
    resolver: zodResolver(createPersonSchema),
    defaultValues: {
      firstName: person?.firstName ?? "",
      lastName: person?.lastName ?? "",
      email: person?.email ?? "",
      githubUsername: person?.githubUsername ?? "",
      gitlabUsername: person?.gitlabUsername ?? "",
    },
  });

  const firstName = watch("firstName");
  const lastName = watch("lastName");
  useEffect(() => {
    if (emailManuallyEdited.current) return;
    if (firstName && lastName) {
      setValue(
        "email",
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}@hypergiant.com`,
      );
    }
  }, [firstName, lastName, setValue]);

  const createMutation = useMutation(
    trpc.person.create.mutationOptions({
      onSuccess: () => {
        toast.success("Person created");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setIsSubmitting(false),
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
      onSettled: () => setIsSubmitting(false),
    }),
  );

  function handleClose() {
    router.push("/people", { scroll: false });
    reset();
  }

  function onSubmit(data: CreatePersonInput) {
    setIsSubmitting(true);
    const withImage = { ...data, imageUrl: imageUrl || "" };
    if (isEditing && person) {
      updateMutation.mutate({ ...withImage, id: person.id });
    } else {
      createMutation.mutate(withImage);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
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
          className="flex flex-col gap-4 px-4 py-4"
        >
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

          {isEditing && person && person.projectMemberships.length > 0 && (
            <div className="space-y-2">
              <Label>Projects</Label>
              <div className="flex flex-wrap gap-1">
                {person.projectMemberships.map((m) => (
                  <span
                    key={m.id}
                    className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
                  >
                    {m.project.name} ({m.role.name})
                  </span>
                ))}
              </div>
            </div>
          )}

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
              {isEditing ? "Save Changes" : "Add Person"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

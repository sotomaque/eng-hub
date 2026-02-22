"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ImageUploader } from "@/components/image-uploader";
import { useTRPC } from "@/lib/trpc/client";
import {
  type CreateProjectInput,
  createProjectSchema,
} from "@/lib/validations/project";

interface ProjectSheetProps {
  project?: {
    id: string;
    name: string;
    description: string | null;
    githubUrl: string | null;
    gitlabUrl: string | null;
    imageUrl: string | null;
    parentId: string | null;
    fundedById: string | null;
  };
  defaultParentId?: string;
}

export function ProjectSheet({ project, defaultParentId }: ProjectSheetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();
  const isEditing = !!project;

  const isOpen = isEditing || searchParams.get("create") === "true";

  const projectsQuery = useQuery(trpc.project.listNames.queryOptions());
  const allProjects = projectsQuery.data ?? [];
  const selectableProjects = allProjects.filter(
    (p) => !project || p.id !== project.id,
  );

  const initialParentId = project?.parentId ?? defaultParentId ?? "";

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: project?.name ?? "",
      description: project?.description ?? "",
      githubUrl: project?.githubUrl ?? "",
      gitlabUrl: project?.gitlabUrl ?? "",
      parentId: initialParentId,
      fundedById: project?.fundedById ?? initialParentId,
    },
  });

  const currentFundedById = watch("fundedById");

  const [imageUrl, setImageUrl] = useState<string | null>(
    project?.imageUrl ?? null,
  );
  const [isImageUploading, setIsImageUploading] = useState(false);

  const createMutation = useMutation(
    trpc.project.create.mutationOptions({
      onSuccess: () => {
        toast.success("Project created");
        handleClose();
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.project.update.mutationOptions({
      onSuccess: () => {
        toast.success("Project updated");
        handleClose();
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("edit");
    params.delete("create");
    router.push(`/projects?${params.toString()}`, { scroll: false });
    reset();
  }

  function onSubmit(data: CreateProjectInput) {
    const withImage = { ...data, imageUrl: imageUrl || "" };
    if (isEditing && project) {
      updateMutation.mutate({ ...withImage, id: project.id });
    } else {
      createMutation.mutate(withImage);
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Project" : "New Project"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the project details below."
              : "Fill in the details to create a new project."}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <ImageUploader
              label="Logo"
              currentImageUrl={imageUrl}
              onUploadComplete={(url) => setImageUrl(url)}
              onRemove={() => setImageUrl(null)}
              onUploadingChange={setIsImageUploading}
              fallbackText={project?.name?.[0] ?? ""}
              shape="square"
            />

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="My Project"
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
                placeholder="A brief description of the project…"
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="githubUrl">GitHub URL</Label>
              <Input
                id="githubUrl"
                type="url"
                placeholder="https://github.com/org/repo"
                {...register("githubUrl")}
                aria-invalid={!!errors.githubUrl}
              />
              {errors.githubUrl && (
                <p className="text-destructive text-sm">
                  {errors.githubUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gitlabUrl">GitLab URL</Label>
              <Input
                id="gitlabUrl"
                type="url"
                placeholder="https://gitlab.com/org/repo"
                {...register("gitlabUrl")}
                aria-invalid={!!errors.gitlabUrl}
              />
              {errors.gitlabUrl && (
                <p className="text-destructive text-sm">
                  {errors.gitlabUrl.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Parent Project</Label>
              <Controller
                name="parentId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={[
                      { value: "__none__", label: "None (top-level)" },
                      ...selectableProjects.map((p) => ({
                        value: p.id,
                        label: p.name,
                      })),
                    ]}
                    value={field.value || "__none__"}
                    onValueChange={(val) => {
                      const newParentId = val === "__none__" ? "" : val;
                      field.onChange(newParentId);
                      if (newParentId && !currentFundedById) {
                        setValue("fundedById", newParentId, {
                          shouldDirty: true,
                        });
                      }
                    }}
                    placeholder="Select parent project…"
                    searchPlaceholder="Search projects…"
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Funded By</Label>
              <Controller
                name="fundedById"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={[
                      { value: "__none__", label: "None" },
                      ...selectableProjects.map((p) => ({
                        value: p.id,
                        label: p.name,
                      })),
                    ]}
                    value={field.value || "__none__"}
                    onValueChange={(val) =>
                      field.onChange(val === "__none__" ? "" : val)
                    }
                    placeholder="Select funding project…"
                    searchPlaceholder="Search projects…"
                  />
                )}
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
                isImageUploading ||
                (!isDirty && imageUrl === (project?.imageUrl ?? null))
              }
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {isEditing ? "Save Changes" : "Create Project"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

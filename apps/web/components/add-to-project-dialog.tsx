"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
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
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/lib/trpc/client";

const addToProjectSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  roleId: z.string().min(1, "Role is required"),
  titleId: z.string().optional().or(z.literal("")),
  teamIds: z.array(z.string()).optional(),
});

type AddToProjectInput = z.infer<typeof addToProjectSchema>;

interface AddToProjectDialogProps {
  personId: string;
  personName: string;
  existingProjectIds: string[];
}

export function AddToProjectDialog({
  personId,
  personName,
  existingProjectIds,
}: AddToProjectDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const projectsQuery = useQuery(trpc.project.getAll.queryOptions());
  const rolesQuery = useQuery(trpc.role.getAll.queryOptions());
  const titlesQuery = useQuery(trpc.title.getAll.queryOptions());

  const availableProjects = (projectsQuery.data ?? []).filter(
    (p) => !existingProjectIds.includes(p.id),
  );

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<AddToProjectInput>({
    resolver: zodResolver(addToProjectSchema),
    defaultValues: {
      projectId: "",
      roleId: "",
      titleId: "",
      teamIds: [],
    },
  });

  const selectedProjectId = watch("projectId");
  const teamsQuery = useQuery({
    ...trpc.team.getByProjectId.queryOptions({ projectId: selectedProjectId }),
    enabled: !!selectedProjectId,
  });

  const joinMutation = useMutation(
    trpc.person.joinProject.mutationOptions({
      onSuccess: () => {
        toast.success(`${personName} added to project`);
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setIsSubmitting(false),
    }),
  );

  function handleClose() {
    router.push("/people", { scroll: false });
  }

  function onSubmit(data: AddToProjectInput) {
    setIsSubmitting(true);
    joinMutation.mutate({
      personId,
      projectId: data.projectId,
      roleId: data.roleId,
      titleId: data.titleId,
      teamIds: data.teamIds,
    });
  }

  const roles = rolesQuery.data ?? [];
  const titles = titlesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Add to Project</SheetTitle>
          <SheetDescription>Add {personName} to a project.</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Controller
                name="projectId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.projectId && (
                <p className="text-destructive text-sm">
                  {errors.projectId.message}
                </p>
              )}
              {availableProjects.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  This person is already on all projects.
                </p>
              )}
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
                      field.onChange(
                        selected.includes(teamId)
                          ? selected.filter((id) => id !== teamId)
                          : [...selected, teamId],
                      );
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
                isSubmitting || !isDirty || availableProjects.length === 0
              }
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              Add to Project
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Combobox } from "@workspace/ui/components/combobox";
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
import { usePathname, useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTRPC } from "@/lib/trpc/client";

const billetLevelEnum = z.enum(["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL"]);

const billetFormSchema = z.object({
  departmentId: z.string().min(1, "Department is required"),
  titleId: z.string().optional(),
  level: billetLevelEnum,
  count: z.number().int().min(1, "Count must be at least 1"),
});

type BilletFormValues = z.infer<typeof billetFormSchema>;

type BilletData = {
  id: string;
  level: string;
  count: number;
  department: { id: string; name: string; color: string | null };
  title: { id: string; name: string } | null;
};

type BilletSheetProps = {
  billet?: BilletData;
  projectId?: string;
};

export function BilletSheet({ billet, projectId }: BilletSheetProps) {
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();
  const isEditing = !!billet;

  const departmentsQuery = useQuery(trpc.department.getAll.queryOptions());
  const departments = departmentsQuery.data ?? [];

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<BilletFormValues>({
    resolver: zodResolver(billetFormSchema),
    defaultValues: {
      departmentId: billet?.department.id ?? "",
      titleId: billet?.title?.id ?? "",
      level: (billet?.level as BilletFormValues["level"]) ?? "MID",
      count: billet?.count ?? 1,
    },
  });

  const selectedDepartmentId = watch("departmentId");
  const selectedDepartment = departments.find((d) => d.id === selectedDepartmentId);
  const filteredTitles = selectedDepartment?.titles ?? [];

  const createMutation = useMutation(
    trpc.billet.create.mutationOptions({
      onSuccess: () => {
        toast.success("Billet created");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.billet.update.mutationOptions({
      onSuccess: () => {
        toast.success("Billet updated");
        handleClose();
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleClose() {
    router.push(pathname, { scroll: false });
    reset();
  }

  function onSubmit(data: BilletFormValues) {
    const payload = {
      departmentId: data.departmentId,
      titleId: data.titleId || "",
      level: data.level,
      count: data.count,
    };

    if (isEditing && billet) {
      updateMutation.mutate({ ...payload, id: billet.id });
    } else {
      createMutation.mutate({ ...payload, projectId: projectId ?? "" });
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Billet" : "Add Billet"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this billet requirement."
              : "Define a contracted position requirement."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Controller
                name="departmentId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={departments.map((d) => ({
                      value: d.id,
                      label: d.name,
                    }))}
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    placeholder="Select department..."
                    searchPlaceholder="Search departments..."
                  />
                )}
              />
              {errors.departmentId && (
                <p className="text-destructive text-sm">{errors.departmentId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Controller
                name="titleId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    options={[
                      { value: "__none__", label: "Any title" },
                      ...filteredTitles.map((t) => ({
                        value: t.id,
                        label: t.name,
                      })),
                    ]}
                    value={field.value || "__none__"}
                    onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                    placeholder="Select title..."
                    searchPlaceholder="Search titles..."
                  />
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Level</Label>
              <Controller
                name="level"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="JUNIOR">Junior</SelectItem>
                      <SelectItem value="MID">Mid</SelectItem>
                      <SelectItem value="SENIOR">Senior</SelectItem>
                      <SelectItem value="LEAD">Lead</SelectItem>
                      <SelectItem value="PRINCIPAL">Principal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="count">Count</Label>
              <Controller
                name="count"
                control={control}
                render={({ field }) => (
                  <Input
                    id="count"
                    type="number"
                    min={1}
                    value={field.value}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value, 10);
                      if (!Number.isNaN(val)) field.onChange(val);
                    }}
                  />
                )}
              />
              {errors.count && <p className="text-destructive text-sm">{errors.count.message}</p>}
            </div>
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isEditing && !isDirty)}>
              {isSubmitting && (
                <span className="animate-spin">
                  <Loader2 />
                </span>
              )}
              {isEditing ? "Save Changes" : "Add Billet"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

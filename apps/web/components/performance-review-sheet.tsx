"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Calendar } from "@workspace/ui/components/calendar";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import { Textarea } from "@workspace/ui/components/textarea";
import { cn } from "@workspace/ui/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, FileText, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { type Control, Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { PersonSelect } from "@/components/person-select";
import { useTRPC } from "@/lib/trpc/client";
import type { PerformanceReview } from "@/lib/types/performance-review";
import { useUploadThing } from "@/lib/uploadthing-components";
import {
  type PerformanceReviewInput,
  performanceReviewSchema,
} from "@/lib/validations/performance-review";

type PerformanceReviewSheetProps = {
  review?: PerformanceReview;
  personId?: string;
  onClose: () => void;
  onSaved: () => void;
};

const DIMENSIONS = [
  {
    label: "Core Competency & Effectiveness",
    scoreField: "coreCompetencyScore" as const,
    commentField: "coreCompetencyComments" as const,
  },
  {
    label: "Teamwork & Communication",
    scoreField: "teamworkScore" as const,
    commentField: "teamworkComments" as const,
  },
  {
    label: "Innovation & Value Creation",
    scoreField: "innovationScore" as const,
    commentField: "innovationComments" as const,
  },
  {
    label: "Time Management",
    scoreField: "timeManagementScore" as const,
    commentField: "timeManagementComments" as const,
  },
];

function AverageDisplay({ control }: { control: Control<PerformanceReviewInput> }) {
  const scores = useWatch({
    control,
    name: ["coreCompetencyScore", "teamworkScore", "innovationScore", "timeManagementScore"],
  });
  const average = scores.reduce((sum, s) => sum + (Number(s) || 0), 0) / 4;

  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
      <span className="font-medium text-sm">Average Score</span>
      <span className="font-semibold text-lg">{average.toFixed(1)}</span>
    </div>
  );
}

export function PerformanceReviewSheet({
  review,
  personId,
  onClose,
  onSaved,
}: PerformanceReviewSheetProps) {
  const trpc = useTRPC();
  const isEditing = !!review;

  const [pdfUrl, setPdfUrl] = useState<string | null>(review?.pdfUrl ?? null);
  const [pdfName, setPdfName] = useState<string | null>(review?.pdfUrl ? "Uploaded PDF" : null);
  const [reviewerId, setReviewerId] = useState<string | null>(review?.reviewerId ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("pdfUploader", {
    onClientUploadComplete: (res) => {
      const url = res[0]?.ufsUrl;
      if (url) {
        setPdfUrl(url);
        setPdfName(res[0]?.name ?? "Uploaded PDF");
        toast.success("PDF uploaded");
      }
    },
    onUploadError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<PerformanceReviewInput>({
    resolver: zodResolver(performanceReviewSchema),
    defaultValues: {
      cycleLabel: review?.cycleLabel ?? "",
      reviewDate: review?.reviewDate ? new Date(review.reviewDate) : new Date(),
      coreCompetencyScore: review?.coreCompetencyScore ?? 3,
      teamworkScore: review?.teamworkScore ?? 3,
      innovationScore: review?.innovationScore ?? 3,
      timeManagementScore: review?.timeManagementScore ?? 3,
      coreCompetencyComments: review?.coreCompetencyComments ?? "",
      teamworkComments: review?.teamworkComments ?? "",
      innovationComments: review?.innovationComments ?? "",
      timeManagementComments: review?.timeManagementComments ?? "",
    },
  });

  const createMutation = useMutation(
    trpc.performanceReview.create.mutationOptions({
      onSuccess: () => {
        toast.success("Review created");
        onSaved();
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.performanceReview.update.mutationOptions({
      onSuccess: () => {
        toast.success("Review updated");
        onSaved();
        onClose();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startUpload([file]);
    e.target.value = "";
  }

  function onSubmit(data: PerformanceReviewInput) {
    const shared = {
      cycleLabel: data.cycleLabel,
      reviewDate: data.reviewDate,
      coreCompetencyScore: data.coreCompetencyScore,
      teamworkScore: data.teamworkScore,
      innovationScore: data.innovationScore,
      timeManagementScore: data.timeManagementScore,
      coreCompetencyComments: data.coreCompetencyComments || undefined,
      teamworkComments: data.teamworkComments || undefined,
      innovationComments: data.innovationComments || undefined,
      timeManagementComments: data.timeManagementComments || undefined,
    };

    if (isEditing && review) {
      updateMutation.mutate({
        ...shared,
        id: review.id,
        pdfUrl: pdfUrl ?? null,
        reviewerId: reviewerId ?? null,
      });
    } else {
      createMutation.mutate({
        ...shared,
        personId,
        pdfUrl: pdfUrl ?? undefined,
        reviewerId: reviewerId ?? undefined,
      });
    }
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isEditing ? "Edit Review" : "Add Performance Review"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update this performance review."
              : "Enter scores and comments for this review cycle."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cycleLabel">Cycle Label</Label>
                <Input
                  id="cycleLabel"
                  placeholder="H1 2025"
                  {...register("cycleLabel")}
                  aria-invalid={!!errors.cycleLabel}
                />
                {errors.cycleLabel ? (
                  <p className="text-destructive text-sm">{errors.cycleLabel.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Review Date</Label>
                <Controller
                  name="reviewDate"
                  control={control}
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {field.value ? format(field.value, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ?? new Date())}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.reviewDate ? (
                  <p className="text-destructive text-sm">{errors.reviewDate.message}</p>
                ) : null}
              </div>
            </div>

            {/* PDF Upload */}
            <div className="space-y-2">
              <Label>Review PDF (optional)</Label>
              {pdfUrl ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
                  <FileText className="text-muted-foreground size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm">{pdfName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => {
                      setPdfUrl(null);
                      setPdfName(null);
                    }}
                  >
                    <X className="size-3.5" />
                    <span className="sr-only">Remove PDF</span>
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <Upload className="mr-1 size-3.5" />
                    )}
                    {isUploading ? "Uploading..." : "Upload PDF"}
                  </Button>
                </>
              )}
            </div>

            {/* Reviewer */}
            <div className="space-y-2">
              <Label>Reviewer (optional)</Label>
              <PersonSelect
                value={reviewerId}
                onChange={setReviewerId}
                placeholder="Select reviewer…"
              />
            </div>

            <Separator />

            {DIMENSIONS.map((dim) => (
              <div key={dim.scoreField} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={dim.scoreField}>{dim.label}</Label>
                  <span className="text-muted-foreground text-xs">Score (1-5)</span>
                </div>
                <Input
                  id={dim.scoreField}
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  {...register(dim.scoreField, { valueAsNumber: true })}
                  aria-invalid={!!errors[dim.scoreField]}
                  className="w-24"
                />
                {errors[dim.scoreField] ? (
                  <p className="text-destructive text-sm">{errors[dim.scoreField]?.message}</p>
                ) : null}
                <Textarea
                  placeholder="Comments & examples (optional)"
                  rows={3}
                  {...register(dim.commentField)}
                />
              </div>
            ))}

            <Separator />

            <AverageDisplay control={control} />
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isUploading || (!isEditing && !isDirty && !pdfUrl)}
            >
              {isSubmitting ? (
                <span className="animate-spin">
                  <Loader2 />
                </span>
              ) : null}
              {isEditing ? "Save Changes" : "Add Review"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

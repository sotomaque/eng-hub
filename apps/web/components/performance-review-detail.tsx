"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Separator } from "@workspace/ui/components/separator";
import { format } from "date-fns";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { computeAverage, type PerformanceReview } from "@/lib/types/performance-review";

type PerformanceReviewDetailProps = {
  review: PerformanceReview;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const DIMENSIONS = [
  {
    label: "Core Competency & Effectiveness",
    scoreKey: "coreCompetencyScore",
    commentKey: "coreCompetencyComments",
  },
  { label: "Teamwork & Communication", scoreKey: "teamworkScore", commentKey: "teamworkComments" },
  {
    label: "Innovation & Value Creation",
    scoreKey: "innovationScore",
    commentKey: "innovationComments",
  },
  {
    label: "Time Management",
    scoreKey: "timeManagementScore",
    commentKey: "timeManagementComments",
  },
] as const;

export function PerformanceReviewDetail({
  review,
  canEdit,
  onClose,
  onEdit,
  onDelete,
}: PerformanceReviewDetailProps) {
  const average = computeAverage(review);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>{review.cycleLabel}</DialogTitle>
            <Badge variant="secondary">Avg: {average.toFixed(1)}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {format(new Date(review.reviewDate), "MMMM d, yyyy")}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {DIMENSIONS.map((dim) => {
            const score = review[dim.scoreKey];
            const comment = review[dim.commentKey];

            return (
              <div key={dim.scoreKey}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{dim.label}</span>
                  <Badge variant="outline">{score} / 5</Badge>
                </div>
                {comment ? (
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground text-sm">
                    {comment}
                  </p>
                ) : null}
              </div>
            );
          })}

          {review.pdfUrl || review.reviewer ? (
            <>
              <Separator />
              <div className="space-y-2">
                {review.reviewer ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reviewer:</span>{" "}
                    {review.reviewer.firstName} {review.reviewer.lastName}
                  </p>
                ) : null}
                {review.pdfUrl ? (
                  <a
                    href={review.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary text-sm hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    View PDF
                  </a>
                ) : null}
              </div>
            </>
          ) : null}

          <Separator />

          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <span className="font-medium text-sm">Average Score</span>
            <span className="font-semibold text-lg">{average.toFixed(1)}</span>
          </div>

          {canEdit ? (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Pencil className="mr-1 size-3.5" />
                Edit
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Trash2 className="mr-1 size-3.5" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete review?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the &quot;{review.cycleLabel}&quot; review.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-white hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { format } from "date-fns";
import { ClipboardList, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { PerformanceReviewChart } from "@/components/performance-review-chart";
import { PerformanceReviewDetail } from "@/components/performance-review-detail";
import { PerformanceReviewSheet } from "@/components/performance-review-sheet";
import { useTRPC } from "@/lib/trpc/client";
import { computeAverage, type PerformanceReview } from "@/lib/types/performance-review";

export default function MyReviewsPage() {
  const trpc = useTRPC();
  const reviewsQuery = useQuery(trpc.performanceReview.listMine.queryOptions());

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<PerformanceReview | null>(null);
  const [detailReview, setDetailReview] = useState<PerformanceReview | null>(null);

  const deleteMutation = useMutation(
    trpc.performanceReview.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Review deleted");
        reviewsQuery.refetch();
        setDetailReview(null);
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const reviews = reviewsQuery.data ?? [];

  const chartData = useMemo(
    () =>
      reviews.map((r) => ({
        id: r.id,
        cycleLabel: r.cycleLabel,
        reviewDate: r.reviewDate,
        coreCompetencyScore: r.coreCompetencyScore,
        teamworkScore: r.teamworkScore,
        innovationScore: r.innovationScore,
        timeManagementScore: r.timeManagementScore,
        average: computeAverage(r),
      })),
    [reviews],
  );

  const handleSelectReview = useCallback(
    (reviewId: string) => {
      const found = reviews.find((r) => r.id === reviewId);
      if (found) setDetailReview(found);
    },
    [reviews],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Performance Reviews</h1>
        <Button
          size="sm"
          onClick={() => {
            setEditingReview(null);
            setSheetOpen(true);
          }}
        >
          <Plus className="size-4" />
          Add Review
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="text-muted-foreground size-4" />
            <CardTitle>Review History</CardTitle>
            {reviews.length > 0 ? (
              <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                {reviews.length}
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ClipboardList className="text-muted-foreground mb-2 size-8" />
              <p className="text-muted-foreground text-sm">
                No performance reviews yet. Add your first review.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.length >= 2 ? (
                <PerformanceReviewChart data={chartData} onSelectReview={handleSelectReview} />
              ) : null}

              <div className="space-y-2">
                {reviews.map((review) => {
                  const avg = computeAverage(review);
                  return (
                    <button
                      type="button"
                      key={review.id}
                      className="flex w-full items-center gap-3 rounded-md border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
                      onClick={() => setDetailReview(review)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm">{review.cycleLabel}</p>
                        <p className="text-muted-foreground text-xs">
                          {format(new Date(review.reviewDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Badge variant="secondary">{avg.toFixed(1)}</Badge>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {sheetOpen ? (
        <PerformanceReviewSheet
          review={editingReview ?? undefined}
          onClose={() => {
            setSheetOpen(false);
            setEditingReview(null);
          }}
          onSaved={() => reviewsQuery.refetch()}
        />
      ) : null}

      {detailReview ? (
        <PerformanceReviewDetail
          review={detailReview}
          canEdit
          onClose={() => setDetailReview(null)}
          onEdit={() => {
            setEditingReview(detailReview);
            setDetailReview(null);
            setSheetOpen(true);
          }}
          onDelete={() => deleteMutation.mutate({ id: detailReview.id })}
        />
      ) : null}
    </div>
  );
}

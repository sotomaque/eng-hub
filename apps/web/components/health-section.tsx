"use client";

import type { HealthStatus } from "@prisma/client";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Activity, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const HEALTH_STYLES: Record<
  HealthStatus,
  { label: string; className: string }
> = {
  GREEN: {
    label: "Good",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  YELLOW: {
    label: "Neutral",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  RED: {
    label: "Bad",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

type AssessmentItem = {
  id: string;
  authorId: string;
  overallStatus: HealthStatus;
  growthStatus: HealthStatus | null;
  marginStatus: HealthStatus | null;
  longevityStatus: HealthStatus | null;
  clientSatisfactionStatus: HealthStatus | null;
  engineeringVibeStatus: HealthStatus | null;
  productVibeStatus: HealthStatus | null;
  designVibeStatus: HealthStatus | null;
  createdAt: string;
};

const DIMENSION_LABELS: { key: keyof AssessmentItem; label: string }[] = [
  { key: "growthStatus", label: "Growth" },
  { key: "marginStatus", label: "Margin" },
  { key: "longevityStatus", label: "Longevity" },
  { key: "clientSatisfactionStatus", label: "Client Sat." },
];

const VIBE_LABELS: { key: keyof AssessmentItem; label: string }[] = [
  { key: "engineeringVibeStatus", label: "Engineering" },
  { key: "productVibeStatus", label: "Product" },
  { key: "designVibeStatus", label: "Design" },
];

interface HealthSectionProps {
  projectId: string;
  assessments: AssessmentItem[];
}

function StatusChip({ status }: { status: HealthStatus | null }) {
  if (!status) {
    return (
      <Badge
        variant="outline"
        className="text-muted-foreground border-dashed text-xs"
      >
        —
      </Badge>
    );
  }
  const style = HEALTH_STYLES[status];
  return <Badge className={style.className}>{style.label}</Badge>;
}

export function HealthSection({ projectId, assessments }: HealthSectionProps) {
  const router = useRouter();
  const latest = assessments[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Health</h2>
          {assessments.length > 0 && (
            <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
              {assessments.length}{" "}
              {assessments.length === 1 ? "assessment" : "assessments"}
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => router.push(`/projects/${projectId}/health/new`)}
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Assessment</span>
        </Button>
      </div>

      {!latest ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Activity className="text-muted-foreground mb-3 size-10" />
              <p className="text-muted-foreground mb-1 text-sm font-medium">
                No health assessments yet
              </p>
              <p className="text-muted-foreground max-w-sm text-xs">
                Create your first assessment to start tracking project health
                across business dimensions and team vibes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Latest Assessment — Current Status */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Latest Assessment</CardTitle>
                <Link
                  href={`/projects/${projectId}/health/${latest.id}`}
                  className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  {new Date(latest.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Overall */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall</span>
                <StatusChip status={latest.overallStatus} />
              </div>

              <Separator />

              {/* Business Dimensions */}
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Business Dimensions
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {DIMENSION_LABELS.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-muted-foreground text-sm">
                        {label}
                      </span>
                      <StatusChip status={latest[key] as HealthStatus | null} />
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Vibe Checks */}
              <div className="space-y-3">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                  Vibe Checks
                </p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {VIBE_LABELS.map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-muted-foreground text-sm">
                        {label}
                      </span>
                      <StatusChip status={latest[key] as HealthStatus | null} />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* History */}
          {assessments.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Previous</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {assessments.slice(1).map((a) => (
                    <Link
                      key={a.id}
                      href={`/projects/${projectId}/health/${a.id}`}
                      className="flex items-center justify-between py-3 first:pt-0 last:pb-0 transition-colors hover:bg-muted/30 -mx-2 px-2 rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        <StatusChip status={a.overallStatus} />
                        <span className="text-muted-foreground text-xs">
                          {new Date(a.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <ChevronRight className="text-muted-foreground size-4" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

import type { HealthStatus } from "@prisma/client";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Activity, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { HEALTH_STATUS_BADGE, HEALTH_STATUS_LABEL } from "@/lib/health-status";

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

const ALL_DIMENSIONS: {
  key: keyof AssessmentItem;
  label: string;
  section: "business" | "vibe";
}[] = [
  { key: "growthStatus", label: "Growth", section: "business" },
  { key: "marginStatus", label: "Margin", section: "business" },
  { key: "longevityStatus", label: "Longevity", section: "business" },
  {
    key: "clientSatisfactionStatus",
    label: "Client Sat.",
    section: "business",
  },
  { key: "engineeringVibeStatus", label: "Engineering", section: "vibe" },
  { key: "productVibeStatus", label: "Product", section: "vibe" },
  { key: "designVibeStatus", label: "Design", section: "vibe" },
];

interface HealthSectionProps {
  projectId: string;
  assessments: AssessmentItem[];
}

function StatusChip({ status }: { status: HealthStatus | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="text-muted-foreground border-dashed text-xs">
        —
      </Badge>
    );
  }
  return <Badge className={HEALTH_STATUS_BADGE[status]}>{HEALTH_STATUS_LABEL[status]}</Badge>;
}

export function HealthSection({ projectId, assessments }: HealthSectionProps) {
  const latest = assessments[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Health</h2>
          {assessments.length > 0 && (
            <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
              {assessments.length} {assessments.length === 1 ? "assessment" : "assessments"}
            </span>
          )}
        </div>
        <Button size="sm" asChild>
          <Link href={`/projects/${projectId}/health/new`}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">New Assessment</span>
          </Link>
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
                Create your first assessment to start tracking project health across business
                dimensions and team vibes.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Latest Assessment */}
          <Card>
            <CardHeader className="pb-4">
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
            <CardContent className="space-y-1">
              {/* Overall — prominent row */}
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2.5">
                <span className="text-sm font-medium">Overall</span>
                <StatusChip status={latest.overallStatus} />
              </div>

              {/* All dimensions in a single scannable list */}
              <div className="divide-y divide-border/50">
                {ALL_DIMENSIONS.map(({ key, label, section }, i) => {
                  const prevSection = i > 0 ? ALL_DIMENSIONS[i - 1]?.section : null;
                  const isNewSection = section !== prevSection;

                  return (
                    <div key={key}>
                      {isNewSection && (
                        <p className="text-muted-foreground px-3 pt-4 pb-1 text-[11px] font-medium uppercase tracking-wider">
                          {section === "business" ? "Business Dimensions" : "Vibe Checks"}
                        </p>
                      )}
                      <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-muted-foreground text-sm">{label}</span>
                        <StatusChip status={latest[key] as HealthStatus | null} />
                      </div>
                    </div>
                  );
                })}
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
                      className="-mx-2 flex items-center justify-between rounded-md px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/30"
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

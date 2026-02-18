"use client";

import type { HealthStatus, StatusUpdate } from "@prisma/client";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Activity, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

const HEALTH_STYLES: Record<
  HealthStatus,
  { className: string; dotClass: string }
> = {
  GREEN: {
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    dotClass: "bg-green-500",
  },
  YELLOW: {
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    dotClass: "bg-yellow-500",
  },
  RED: {
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    dotClass: "bg-red-500",
  },
};

interface HealthSectionProps {
  projectId: string;
  statusUpdates: StatusUpdate[];
}

export function HealthSection({
  projectId,
  statusUpdates,
}: HealthSectionProps) {
  const router = useRouter();

  function handleAdd() {
    router.push(`/projects/${projectId}?addStatus=true`, { scroll: false });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Health Status</CardTitle>
            <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
              {statusUpdates.length}
            </span>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Update</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {statusUpdates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="text-muted-foreground mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              No status updates yet. Add one to start tracking project health.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {statusUpdates.map((update) => {
              const style = HEALTH_STYLES[update.status];
              return (
                <div
                  key={update.id}
                  className="flex gap-3 border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="mt-1.5 flex shrink-0">
                    <span className={`size-3 rounded-full ${style.dotClass}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge className={style.className}>{update.status}</Badge>
                      <span className="text-muted-foreground text-xs">
                        {update.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    {update.description && (
                      <p className="mt-1 text-sm">{update.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

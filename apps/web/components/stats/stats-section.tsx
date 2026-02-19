"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import { StatsBarChart } from "./stats-bar-chart";
import { StatsDataTable } from "./stats-data-table";
import { StatsInsights } from "./stats-insights";
import { StatsKPICards } from "./stats-kpi-cards";
import { StatsPieChart } from "./stats-pie-chart";

interface StatsSectionProps {
  projectId: string;
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export function StatsSection({ projectId }: StatsSectionProps) {
  const trpc = useTRPC();
  const autoSyncTriggered = useRef(false);

  const statsQuery = useQuery(
    trpc.githubStats.getByProjectId.queryOptions({ projectId }),
  );

  const syncMutation = useMutation(
    trpc.githubStats.syncNow.mutationOptions({
      onSuccess: () => {
        toast.success("GitHub stats synced successfully");
        statsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  // Auto-sync if data is stale
  useEffect(() => {
    if (autoSyncTriggered.current) return;
    if (statsQuery.isLoading) return;

    const sync = statsQuery.data?.sync;
    const isStale =
      !sync?.lastSyncAt ||
      Date.now() - new Date(sync.lastSyncAt).getTime() > STALE_THRESHOLD_MS;
    const isSyncing = sync?.syncStatus === "syncing";

    if (isStale && !isSyncing) {
      autoSyncTriggered.current = true;
      syncMutation.mutate({ projectId });
    }
  }, [statsQuery.isLoading, statsQuery.data?.sync, projectId, syncMutation]);

  if (statsQuery.isLoading) {
    return <StatsSkeletonUI />;
  }

  const { stats, sync, memberMap } = statsQuery.data ?? {
    stats: [],
    sync: null,
    memberMap: {},
  };

  const isSyncing = sync?.syncStatus === "syncing" || syncMutation.isPending;

  const allTimeStats = stats.filter((s) => s.period === "all_time");
  const ytdStats = stats.filter((s) => s.period === "ytd");

  return (
    <div className="space-y-6">
      {/* Sync status bar */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          {sync?.lastSyncAt ? (
            <>
              Last synced{" "}
              {formatDistanceToNow(new Date(sync.lastSyncAt), {
                addSuffix: true,
              })}
            </>
          ) : (
            "Never synced"
          )}
          {sync?.syncStatus === "error" && sync.syncError && (
            <span className="ml-2 text-destructive">
              <AlertCircle className="mr-1 inline size-3" />
              {sync.syncError}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncMutation.mutate({ projectId })}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          {isSyncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {stats.length === 0 && !isSyncing ? (
        <div className="text-muted-foreground py-12 text-center text-sm">
          No contributor stats yet. Click &quot;Sync Now&quot; to fetch data
          from GitHub, or ensure team members have GitHub usernames set.
        </div>
      ) : (
        <Tabs defaultValue="all_time">
          <TabsList>
            <TabsTrigger value="all_time">All Time</TabsTrigger>
            <TabsTrigger value="ytd">Year to Date</TabsTrigger>
          </TabsList>

          <TabsContent value="all_time" className="space-y-6">
            <StatsKPICards stats={allTimeStats} />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <StatsBarChart stats={allTimeStats} memberMap={memberMap} />
              </div>
              <StatsPieChart stats={allTimeStats} memberMap={memberMap} />
            </div>
            <StatsDataTable stats={allTimeStats} memberMap={memberMap} />
            <StatsInsights stats={allTimeStats} memberMap={memberMap} />
          </TabsContent>

          <TabsContent value="ytd" className="space-y-6">
            <StatsKPICards stats={ytdStats} />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <StatsBarChart stats={ytdStats} memberMap={memberMap} />
              </div>
              <StatsPieChart stats={ytdStats} memberMap={memberMap} />
            </div>
            <StatsDataTable stats={ytdStats} memberMap={memberMap} />
            <StatsInsights stats={ytdStats} memberMap={memberMap} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function StatsSkeletonUI() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <Skeleton className="h-80 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

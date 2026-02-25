export type Tier = "S" | "A" | "B" | "C";

/** Serialized ContributorStats shape from tRPC (dates as strings) */
export type ContributorStatsData = {
  id: string;
  projectId: string;
  githubUsername: string;
  period: string;
  commits: number;
  prsOpened: number;
  prsMerged: number;
  reviewsDone: number;
  additions: number;
  deletions: number;
  avgWeeklyCommits: number;
  recentWeeklyCommits: number;
  trend: string;
  avgWeeklyReviews: number;
  recentWeeklyReviews: number;
  reviewTrend: string;
};

export function assignTiers<T extends { commits: number }>(stats: T[]): Map<T, Tier> {
  const sorted = [...stats].sort((a, b) => b.commits - a.commits);
  const total = sorted.length;
  const result = new Map<T, Tier>();

  for (let i = 0; i < sorted.length; i++) {
    const pct = (i + 1) / total;
    const tier: Tier = pct <= 0.1 ? "S" : pct <= 0.3 ? "A" : pct <= 0.6 ? "B" : "C";
    const item = sorted[i];
    if (item) result.set(item, tier);
  }

  return result;
}

export const tierConfig: Record<
  Tier,
  { label: string; color: string; bgClass: string; textClass: string }
> = {
  S: {
    label: "S",
    color: "#10b981",
    bgClass: "bg-emerald-100 dark:bg-emerald-950",
    textClass: "text-emerald-700 dark:text-emerald-400",
  },
  A: {
    label: "A",
    color: "#3b82f6",
    bgClass: "bg-blue-100 dark:bg-blue-950",
    textClass: "text-blue-700 dark:text-blue-400",
  },
  B: {
    label: "B",
    color: "#f59e0b",
    bgClass: "bg-amber-100 dark:bg-amber-950",
    textClass: "text-amber-700 dark:text-amber-400",
  },
  C: {
    label: "C",
    color: "#64748b",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-400",
  },
};

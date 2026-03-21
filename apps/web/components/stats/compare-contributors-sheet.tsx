"use client";

import { useMutation } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
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
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Download, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { downloadCsv, downloadJson, downloadText, downloadXlsx } from "@/lib/export";
import { useTRPC } from "@/lib/trpc/client";

const CompareAISummary = dynamic(
  () => import("./compare-ai-summary").then((m) => m.CompareAISummary),
  { ssr: false },
);

type MemberInfo = {
  personId: string;
  firstName: string;
  lastName: string;
  callsign: string | null;
  imageUrl: string | null;
  leftAt: string | null;
  isTeamMember: boolean;
};

type CompareContributorsSheetProps = {
  projectId: string;
  selectedUsernames: string[];
  memberMap: Record<string, MemberInfo>;
  hasAnthropicKey?: boolean;
  onClose: () => void;
};

type ContributorData = {
  personId: string;
  name: string;
  totalCommits: number;
  allTimeCommits: number;
  mrsMerged: number;
  additions: number;
  deletions: number;
  netLines: number;
  firstCommitDate: string | null;
  lastCommitDate: string | null;
  monthlyCommits: Record<string, number>;
  monthlyMRs: Record<string, number>;
  commitTypes: { type: string; count: number }[];
  topFiles: { file: string; count: number }[];
  recentMRs: { branch: string; date: string }[];
};

const COMPARE_LOADING_STEPS = [
  "Fetching contributor data…",
  "Analyzing contributions…",
  "Comparing work patterns…",
  "Evaluating monthly trends…",
  "Generating report…",
];

function useLoadingSteps(steps: string[], isActive: boolean) {
  const [step, setStep] = useState(0);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (interval.current) {
      clearInterval(interval.current);
      interval.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setStep(0);
    stop();
    interval.current = setInterval(() => {
      setStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);
  }, [stop, steps.length]);

  useEffect(() => {
    if (!isActive) stop();
  }, [isActive, stop]);

  return { message: steps[step], start };
}

export function CompareContributorsSheet({
  projectId,
  selectedUsernames,
  memberMap,
  hasAnthropicKey,
  onClose,
}: CompareContributorsSheetProps) {
  const trpc = useTRPC();
  const [referencePersonId, setReferencePersonId] = useState<string | undefined>();

  const personIds = selectedUsernames
    .map((u) => memberMap[u]?.personId)
    .filter((id): id is string => !!id);

  const uniquePersonIds = useMemo(() => [...new Set(personIds)], [personIds]);

  const compareMutation = useMutation(
    trpc.githubStats.compareContributors.mutationOptions({
      onError: (error) => {
        console.error("Compare failed:", error.message);
      },
    }),
  );

  const compareLoading = useLoadingSteps(COMPARE_LOADING_STEPS, compareMutation.isPending);

  // Trigger fetch once on mount via useEffect (not during render) so the
  // mutation observer is properly connected after React commits the component.
  const { mutate } = compareMutation;
  useEffect(() => {
    if (uniquePersonIds.length >= 2) {
      compareLoading.start();
      mutate({ projectId, personIds: uniquePersonIds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const data = compareMutation.data;
  const [aiSummary, setAiSummary] = useState("");

  const buildExportRows = useCallback(() => {
    if (!data) return [];
    return data.contributors.map((c) => ({
      Name: c.name,
      "All-time Commits": c.allTimeCommits,
      "Period Commits": c.totalCommits,
      "MRs Merged": c.mrsMerged,
      "Lines Added": c.additions,
      "Lines Removed": c.deletions,
      "Net Lines": c.netLines,
      "First Commit": c.firstCommitDate ?? "",
      "Last Commit": c.lastCommitDate ?? "",
    }));
  }, [data]);

  const buildExportText = useCallback(() => {
    if (!data) return "";
    const lines: string[] = ["# Contributor Comparison Report", ""];
    for (const c of data.contributors) {
      lines.push(`## ${c.name}`);
      lines.push(`- All-time Commits: ${c.allTimeCommits}`);
      lines.push(`- Period Commits: ${c.totalCommits}`);
      lines.push(`- MRs Merged: ${c.mrsMerged}`);
      lines.push(`- Lines Added: ${c.additions.toLocaleString()}`);
      lines.push(`- Lines Removed: ${c.deletions.toLocaleString()}`);
      lines.push(`- Net Lines: ${c.netLines.toLocaleString()}`);
      lines.push(`- First Commit: ${c.firstCommitDate ?? "N/A"}`);
      lines.push(`- Last Commit: ${c.lastCommitDate ?? "N/A"}`);
      if (c.commitTypes.length > 0) {
        lines.push(
          `- Commit Types: ${c.commitTypes.map((t) => `${t.type}(${t.count})`).join(", ")}`,
        );
      }
      lines.push("");
    }
    if (data.months.length > 0) {
      lines.push("## Monthly Commits");
      for (const month of data.months) {
        const vals = data.contributors.map((c) => `${c.name}: ${c.monthlyCommits[month] ?? 0}`);
        lines.push(`- ${month}: ${vals.join(", ")}`);
      }
      lines.push("");
    }
    if (aiSummary) {
      lines.push("## AI Analysis", "", aiSummary, "");
    }
    return lines.join("\n");
  }, [data, aiSummary]);

  const handleExport = useCallback(
    async (format: "xlsx" | "csv" | "json" | "text") => {
      try {
        if (format === "text") {
          downloadText(buildExportText(), "contributor-comparison");
        } else {
          const rows = buildExportRows();
          if (format === "xlsx") await downloadXlsx(rows, "contributor-comparison");
          else if (format === "csv") downloadCsv(rows, "contributor-comparison");
          else downloadJson(rows, "contributor-comparison");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Export failed");
      }
    },
    [buildExportRows, buildExportText],
  );

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex w-full max-w-4xl flex-col overflow-hidden sm:max-w-4xl">
        <SheetHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <SheetTitle>Compare Contributors</SheetTitle>
            <SheetDescription>Side-by-side contributor comparison</SheetDescription>
          </div>
          {data && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 shrink-0 mr-8">
                  <Download className="size-3.5" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => handleExport("xlsx")}>
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport("csv")}>CSV (.csv)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport("json")}>
                  JSON (.json)
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleExport("text")}>
                  Raw Text (.txt)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-8">
          {compareMutation.isPending ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <Loader2 className="text-muted-foreground size-8 animate-spin" />
              <p className="text-muted-foreground text-sm">{compareLoading.message}</p>
            </div>
          ) : null}

          {compareMutation.isError ? (
            <div className="py-16 text-center">
              <p className="text-destructive text-sm">{compareMutation.error.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  compareLoading.start();
                  compareMutation.mutate({ projectId, personIds: uniquePersonIds });
                }}
              >
                Retry
              </Button>
            </div>
          ) : null}

          {data ? (
            <>
              {/* Reference selector */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Baseline</span>
                <Select
                  value={referencePersonId ?? "none"}
                  onValueChange={(v) => setReferencePersonId(v === "none" ? undefined : v)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {data.contributors.map((c) => (
                      <SelectItem key={c.personId} value={c.personId}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <OverviewTable
                    contributors={data.contributors}
                    referencePersonId={referencePersonId}
                  />
                </CardContent>
              </Card>

              {/* Monthly Commits */}
              {data.months.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Commits</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MonthlyTable
                      months={data.months}
                      contributors={data.contributors}
                      field="monthlyCommits"
                    />
                  </CardContent>
                </Card>
              ) : null}

              {/* Monthly MRs */}
              {data.months.length > 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly MRs / PRs Merged</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <MonthlyTable
                      months={data.months}
                      contributors={data.contributors}
                      field="monthlyMRs"
                    />
                  </CardContent>
                </Card>
              ) : null}

              {/* Commit Types with percentages */}
              {data.contributors.some((c) => c.commitTypes.length > 0) ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Work Type Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CommitTypesTable contributors={data.contributors} />
                  </CardContent>
                </Card>
              ) : null}

              {/* Ranking Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Ranking Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <RankingSummary
                    contributors={data.contributors}
                    referencePersonId={referencePersonId}
                  />
                </CardContent>
              </Card>

              {/* Focus Areas */}
              {data.contributors.some((c) => c.topFiles.length > 0) ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Focus Areas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      {data.contributors.map((c) => (
                        <div key={c.personId}>
                          <h4 className="mb-2 text-sm font-semibold">{c.name}</h4>
                          {c.topFiles.length === 0 ? (
                            <p className="text-muted-foreground text-xs">No file data</p>
                          ) : (
                            <div className="space-y-1">
                              {c.topFiles.slice(0, 10).map((f) => (
                                <div
                                  key={f.file}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <span className="text-muted-foreground truncate">{f.file}</span>
                                  <span className="shrink-0 font-mono">{f.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Recent MRs */}
              {data.contributors.some((c) => c.recentMRs.length > 0) ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Recent MR Highlights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                      {data.contributors.map((c) => (
                        <div key={c.personId}>
                          <h4 className="mb-2 text-sm font-semibold">{c.name}</h4>
                          {c.recentMRs.length === 0 ? (
                            <p className="text-muted-foreground text-xs">No MRs found</p>
                          ) : (
                            <div className="space-y-1">
                              {c.recentMRs.map((mr) => (
                                <div
                                  key={`${mr.branch}-${mr.date}`}
                                  className="flex items-center justify-between gap-2 text-xs"
                                >
                                  <Badge variant="secondary" className="truncate font-mono text-xs">
                                    {mr.branch}
                                  </Badge>
                                  <span className="text-muted-foreground shrink-0">{mr.date}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* AI Summary — lazy-loaded to keep @ai-sdk/react out of the main bundle */}
              {hasAnthropicKey ? (
                <CompareAISummary data={data} onCompletionChange={setAiSummary} />
              ) : null}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// --- Helper Components ---

function formatPct(value: number, reference: number): string {
  if (reference === 0) return "";
  const pct = Math.round(((value - reference) / reference) * 100);
  if (pct === 0) return "(0%)";
  return pct > 0 ? `(+${pct}%)` : `(${pct}%)`;
}

function pctClass(value: number, reference: number): string {
  if (reference === 0) return "text-muted-foreground";
  const pct = ((value - reference) / reference) * 100;
  if (pct > 10) return "text-green-600 dark:text-green-400";
  if (pct < -10) return "text-red-600 dark:text-red-400";
  return "text-muted-foreground";
}

function formatTenure(firstCommitDate: string | null): string {
  if (!firstCommitDate) return "\u2014";
  const first = new Date(firstCommitDate);
  const now = new Date();
  const months =
    (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth());
  if (months < 1) return "<1 mo";
  if (months < 12) return `${months} mo`;
  const years = months / 12;
  return `${years.toFixed(1)} yr`;
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthIdx = Number.parseInt(month ?? "1", 10) - 1;
  return `${monthNames[monthIdx]} ${year?.slice(2)}`;
}

function OverviewTable({
  contributors,
  referencePersonId,
}: {
  contributors: ContributorData[];
  referencePersonId: string | undefined;
}) {
  const ref = referencePersonId
    ? contributors.find((c) => c.personId === referencePersonId)
    : undefined;

  type NumericMetric = {
    label: string;
    key: keyof Pick<
      ContributorData,
      "allTimeCommits" | "totalCommits" | "mrsMerged" | "additions" | "deletions" | "netLines"
    >;
  };

  const metrics: NumericMetric[] = [
    { label: "All-time Commits", key: "allTimeCommits" },
    { label: "Period Commits", key: "totalCommits" },
    { label: "MRs Merged", key: "mrsMerged" },
    { label: "Lines Added", key: "additions" },
    { label: "Lines Removed", key: "deletions" },
    { label: "Net Lines", key: "netLines" },
  ];

  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 text-xs">Metric</TableHead>
            {contributors.map((c) => (
              <TableHead key={c.personId} className="pr-4 text-right text-xs">
                {c.name}
                {ref && c.personId === ref.personId && (
                  <span className="text-muted-foreground ml-1 text-xs">(ref)</span>
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Tenure */}
          <TableRow>
            <TableCell className="pl-4 text-sm font-medium">Tenure</TableCell>
            {contributors.map((c) => (
              <TableCell key={c.personId} className="pr-4 text-right text-sm">
                {formatTenure(c.firstCommitDate)}
              </TableCell>
            ))}
          </TableRow>

          {/* Numeric metrics */}
          {metrics.map((m) => (
            <TableRow key={m.key}>
              <TableCell className="pl-4 text-sm font-medium">{m.label}</TableCell>
              {contributors.map((c) => {
                const value = c[m.key];
                const refValue = ref ? ref[m.key] : undefined;
                const showPct = m.key !== "allTimeCommits"; // no % for all-time
                return (
                  <TableCell key={c.personId} className="pr-4 text-right text-sm tabular-nums">
                    <span>
                      {m.key === "additions" ? "+" : ""}
                      {m.key === "deletions" ? "-" : ""}
                      {value.toLocaleString()}
                    </span>
                    {showPct && ref && c.personId !== ref.personId && refValue !== undefined && (
                      <span className={`ml-1 text-xs ${pctClass(value, refValue)}`}>
                        {formatPct(value, refValue)}
                      </span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}

          {/* Date rows */}
          <TableRow>
            <TableCell className="pl-4 text-sm font-medium">First Commit</TableCell>
            {contributors.map((c) => (
              <TableCell key={c.personId} className="pr-4 text-right text-sm">
                {c.firstCommitDate ?? "\u2014"}
              </TableCell>
            ))}
          </TableRow>
          <TableRow>
            <TableCell className="pl-4 text-sm font-medium">Last Commit</TableCell>
            {contributors.map((c) => (
              <TableCell key={c.personId} className="pr-4 text-right text-sm">
                {c.lastCommitDate ?? "\u2014"}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function MonthlyTable({
  months,
  contributors,
  field,
}: {
  months: string[];
  contributors: ContributorData[];
  field: "monthlyCommits" | "monthlyMRs";
}) {
  const totals = contributors.map((c) => months.reduce((sum, m) => sum + (c[field][m] ?? 0), 0));

  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 text-xs">Month</TableHead>
            {contributors.map((c) => (
              <TableHead key={c.personId} className="pr-4 text-right text-xs">
                {c.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {months.map((month) => (
            <TableRow key={month}>
              <TableCell className="pl-4 text-sm font-medium">{formatMonth(month)}</TableCell>
              {contributors.map((c) => {
                const val = c[field][month] ?? 0;
                return (
                  <TableCell
                    key={c.personId}
                    className={`pr-4 text-right text-sm tabular-nums ${val === 0 ? "text-muted-foreground" : ""}`}
                  >
                    {val}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {/* Totals row */}
          <TableRow className="border-t-2 font-semibold">
            <TableCell className="pl-4 text-sm">Total</TableCell>
            {totals.map((total, i) => (
              <TableCell
                key={contributors[i]?.personId ?? i}
                className="pr-4 text-right text-sm tabular-nums"
              >
                {total}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function CommitTypesTable({ contributors }: { contributors: ContributorData[] }) {
  // Collect all unique commit types across contributors
  const allTypes = new Set<string>();
  for (const c of contributors) {
    for (const ct of c.commitTypes) {
      allTypes.add(ct.type);
    }
  }
  const types = [...allTypes].sort((a, b) => {
    // Prioritize: feat, fix, chore, refactor, then alphabetical
    const priority = ["feat", "fix", "chore", "refactor", "test", "docs", "style", "ci"];
    const ai = priority.indexOf(a);
    const bi = priority.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4 text-xs">Type</TableHead>
            {contributors.map((c) => (
              <TableHead key={c.personId} className="pr-4 text-right text-xs">
                {c.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {types.map((type) => (
            <TableRow key={type}>
              <TableCell className="pl-4 font-medium font-mono text-sm">{type}:</TableCell>
              {contributors.map((c) => {
                const ct = c.commitTypes.find((t) => t.type === type);
                const count = ct?.count ?? 0;
                const totalTyped = c.commitTypes.reduce((s, t) => s + t.count, 0);
                const pct = totalTyped > 0 ? Math.round((count / totalTyped) * 100) : 0;
                return (
                  <TableCell
                    key={c.personId}
                    className={`pr-4 text-right text-sm tabular-nums ${count === 0 ? "text-muted-foreground" : ""}`}
                  >
                    {count > 0 ? (
                      <span>
                        {count} <span className="text-muted-foreground text-xs">({pct}%)</span>
                      </span>
                    ) : (
                      "\u2014"
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RankingSummary({
  contributors,
  referencePersonId,
}: {
  contributors: ContributorData[];
  referencePersonId: string | undefined;
}) {
  const rankings: {
    label: string;
    key: keyof Pick<ContributorData, "mrsMerged" | "totalCommits" | "additions" | "netLines">;
  }[] = [
    { label: "By MRs Merged", key: "mrsMerged" },
    { label: "By Commits", key: "totalCommits" },
    { label: "By Lines Added", key: "additions" },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {rankings.map((r) => {
        const sorted = [...contributors].sort((a, b) => b[r.key] - a[r.key]);
        const topValue = sorted[0]?.[r.key] ?? 1;

        return (
          <div key={r.key}>
            <h4 className="mb-2 text-sm font-semibold">{r.label}</h4>
            <div className="space-y-1">
              {sorted.map((c, i) => {
                const value = c[r.key];
                const isRef = c.personId === referencePersonId;
                const pctOfTop = topValue > 0 ? Math.round((value / topValue) * 100) : 0;
                return (
                  <div key={c.personId} className="flex items-center justify-between text-sm">
                    <span className={isRef ? "font-semibold" : ""}>
                      {i + 1}. {c.name}
                      {isRef && <span className="text-muted-foreground ml-1 text-xs">(ref)</span>}
                    </span>
                    <span className="font-mono tabular-nums">
                      {value.toLocaleString()}
                      {i > 0 && (
                        <span className="text-muted-foreground ml-1 text-xs">({pctOfTop}%)</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import Markdown from "react-markdown";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

type MemberInfo = {
  personId: string;
  firstName: string;
  lastName: string;
  callsign: string | null;
  imageUrl: string | null;
};

type MergeDigestProps = {
  projectId: string;
  memberMap: Record<string, MemberInfo>;
  hasAnthropicKey?: boolean;
};

export function MergeDigest({ projectId, memberMap, hasAnthropicKey }: MergeDigestProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [days, setDays] = useState<"7" | "14" | "30">("7");

  const digestQuery = useQuery(trpc.githubStats.getMergeDigest.queryOptions({ projectId, days }));

  const summaryQuery = useQuery(trpc.githubStats.getMergeSummary.queryOptions({ projectId, days }));

  const generateMutation = useMutation(
    trpc.githubStats.generateMergeSummary.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.githubStats.getMergeSummary.queryOptions({ projectId, days }).queryKey,
        });
        toast.success("Summary generated");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const digest = digestQuery.data;
  const summary = summaryQuery.data;
  const isLoading = digestQuery.isLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Merge Digest</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Merge Digest</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={days} onValueChange={(v) => setDays(v as "7" | "14" | "30")}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
              </SelectContent>
            </Select>
            {hasAnthropicKey && digest && digest.total > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => generateMutation.mutate({ projectId, days })}
                disabled={generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {summary ? "Regenerate" : "Generate Summary"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!digest || digest.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No merges found in the last {days} days. Try syncing or selecting a longer period.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {digest.total} {digest.total === 1 ? "merge" : "merges"} across{" "}
              {Object.keys(digest.byContributor).length}{" "}
              {Object.keys(digest.byContributor).length === 1 ? "contributor" : "contributors"}
            </p>

            {summary && (
              <div className="rounded-md border bg-muted/30 p-4 text-sm prose prose-sm dark:prose-invert max-w-none">
                <Markdown>{summary.summary}</Markdown>
              </div>
            )}

            <div className="space-y-3">
              {Object.entries(digest.byContributor).map(([username, count]) => {
                const member = memberMap[username];
                const displayName = member ? `${member.firstName} ${member.lastName}` : username;
                const initials = member
                  ? `${member.firstName[0]}${member.lastName[0]}`
                  : username.slice(0, 2).toUpperCase();

                return (
                  <div key={username} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarImage src={member?.imageUrl ?? undefined} />
                        <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{displayName}</span>
                      <Badge variant="secondary" className="text-xs">
                        {count}
                      </Badge>
                    </div>
                    <ul className="ml-8 space-y-0.5">
                      {digest.entries
                        .filter((e) => e.authorUsername === username)
                        .map((entry) => (
                          <li key={entry.id} className="text-xs text-muted-foreground">
                            {entry.url ? (
                              <a
                                href={entry.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {entry.title}
                              </a>
                            ) : (
                              entry.title
                            )}
                          </li>
                        ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

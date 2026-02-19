"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Loader2, NotebookPen, Users } from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/lib/trpc/client";

export default function DirectReportsPage() {
  const trpc = useTRPC();
  const meQuery = useQuery(trpc.person.me.queryOptions());

  if (meQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  const directReports = meQuery.data?.directReports ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Direct Reports</h1>

      {directReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Users className="text-muted-foreground mb-4 size-12" />
          <h2 className="text-lg font-semibold">No direct reports</h2>
          <p className="text-muted-foreground text-sm">
            People who report to you will appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {directReports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarImage
                      src={report.imageUrl ?? undefined}
                      alt={`${report.firstName} ${report.lastName}`}
                    />
                    <AvatarFallback>
                      {report.firstName[0]}
                      {report.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">
                      {report.firstName} {report.lastName}
                    </CardTitle>
                    {report.email && (
                      <p className="text-muted-foreground text-xs">
                        {report.email}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/me/one-on-ones/new?personId=${report.id}`}>
                    <NotebookPen className="size-4" />
                    New 1:1
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

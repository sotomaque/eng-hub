"use client";

import { useMutation } from "@tanstack/react-query";
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
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Briefcase, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

const LEVEL_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MID: "Mid",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

const LEVEL_STYLES: Record<string, string> = {
  JUNIOR: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  MID: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  SENIOR: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  LEAD: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  PRINCIPAL: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

type BilletData = {
  id: string;
  level: string;
  count: number;
  department: { id: string; name: string; color: string | null };
  title: { id: string; name: string } | null;
};

type BilletSectionProps = {
  billets: BilletData[];
};

export function BilletSection({ billets }: BilletSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const trpc = useTRPC();

  const deleteMutation = useMutation(
    trpc.billet.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Billet deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const totalPositions = billets.reduce((sum, b) => sum + b.count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Briefcase className="text-muted-foreground size-4" />
          <CardTitle>Billets</CardTitle>
          {billets.length > 0 && (
            <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
              {totalPositions} {totalPositions === 1 ? "position" : "positions"}
            </span>
          )}
          <Button variant="outline" size="sm" className="ml-auto" asChild>
            <Link href={`${pathname}?create=true`}>
              <Plus className="mr-1 size-3.5" />
              Add Billet
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {billets.length === 0 ? (
          <p className="text-muted-foreground text-sm">No billets defined yet.</p>
        ) : (
          <div className="space-y-2">
            {billets.map((billet) => (
              <div
                key={billet.id}
                className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-sm">
                    {billet.department.name}
                    {billet.title ? ` — ${billet.title.name}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge className={LEVEL_STYLES[billet.level] ?? ""}>
                    {LEVEL_LABELS[billet.level] ?? billet.level}
                  </Badge>
                  <span className="text-muted-foreground text-xs font-medium tabular-nums">
                    x{billet.count}
                  </span>
                  <Button variant="ghost" size="icon" className="size-7" asChild>
                    <Link href={`${pathname}?edit=${billet.id}`}>
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Edit</span>
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-7">
                        <Trash2 className="size-3.5" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete billet?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this billet requirement.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate({ id: billet.id })}
                          className="bg-destructive text-white hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

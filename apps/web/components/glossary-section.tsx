"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAccess } from "@/lib/hooks/use-access";
import { useTRPC } from "@/lib/trpc/client";

type GlossaryEntry = {
  id: string;
  term: string;
  definition: string;
};

type GlossarySectionProps = {
  projectId: string;
  entries: GlossaryEntry[];
};

export function GlossarySection({ projectId, entries }: GlossarySectionProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const { can } = useAccess();
  const canWrite = can("project:glossary:write", projectId);

  const deleteMutation = useMutation(
    trpc.glossary.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Entry deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Glossary</h2>
          <p className="text-muted-foreground text-sm">Project-specific terms and definitions.</p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={() => router.push(`?addEntry=true`, { scroll: false })}>
            <Plus className="size-4" />
            Add Entry
          </Button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
          <BookOpen className="text-muted-foreground/40 mb-3 size-10" strokeWidth={1} />
          <p className="text-muted-foreground text-sm font-medium">No glossary entries yet</p>
          {canWrite && (
            <p className="text-muted-foreground mt-1 text-xs">
              Add terms to help the team speak the same language.
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y rounded-2xl border">
          {entries.map((entry) => (
            <div key={entry.id} className="group flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{entry.term}</p>
                <p className="text-muted-foreground mt-0.5 text-sm leading-relaxed">
                  {entry.definition}
                </p>
              </div>
              {canWrite && (
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    onClick={() => router.push(`?editEntry=${entry.id}`, { scroll: false })}
                  >
                    <Pencil className="size-3.5" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive size-7"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate({ id: entry.id })}
                  >
                    <Trash2 className="size-3.5" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import type { ProjectLink } from "@prisma/client";
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { getLinkMeta } from "@/lib/constants/link-icons";
import { getTagColor } from "@/lib/tag-colors";
import { useTRPC } from "@/lib/trpc/client";

interface LinksSectionProps {
  projectId: string;
  links: ProjectLink[];
  githubUrl: string | null;
  gitlabUrl: string | null;
}

function LinkRow({
  url,
  label,
  tags,
  actions,
}: {
  url: string;
  label: string;
  tags?: string[];
  actions?: React.ReactNode;
}) {
  const meta = getLinkMeta(url);
  const Icon = meta.icon;

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <Icon className={`size-4 shrink-0 ${meta.color}`} />
        <span className="truncate text-sm font-medium">{label}</span>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge
                key={tag}
                className={cn("border-0 px-1.5 py-0 text-xs", getTagColor(tag))}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
        >
          View
          <ExternalLink className="size-3" />
        </a>
        {actions}
      </div>
    </div>
  );
}

export function LinksSection({
  projectId,
  links,
  githubUrl,
  gitlabUrl,
}: LinksSectionProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = Array.from(new Set(links.flatMap((l) => l.tags ?? [])))
    .sort()
    .map((tag) => ({ label: tag, value: tag }));

  const filteredLinks =
    selectedTags.length > 0
      ? links.filter((link) =>
          selectedTags.some((tag) => link.tags?.includes(tag)),
        )
      : links;

  const deleteMutation = useMutation(
    trpc.projectLink.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Link deleted");
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
      onSettled: () => setDeletingId(null),
    }),
  );

  function handleAdd() {
    router.push(`/projects/${projectId}/links?addLink=true`, {
      scroll: false,
    });
  }

  function handleEdit(id: string) {
    router.push(`/projects/${projectId}/links?editLink=${id}`, {
      scroll: false,
    });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    deleteMutation.mutate({ id });
  }

  const hasBuiltInLinks = githubUrl || gitlabUrl;
  const hasAnyLinks = hasBuiltInLinks || links.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Links</CardTitle>
          <Button onClick={handleAdd} size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Link</span>
          </Button>
        </div>
      </CardHeader>
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 px-6 pb-2">
          <DataTableFacetedFilter
            title="Tags"
            options={allTags}
            value={selectedTags}
            onValueChange={setSelectedTags}
          />
        </div>
      )}
      <CardContent>
        {!hasAnyLinks ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Link2 className="text-muted-foreground mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              No links yet. Add links to Figma, docs, or other resources.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {githubUrl && <LinkRow url={githubUrl} label="GitHub" />}
            {gitlabUrl && <LinkRow url={gitlabUrl} label="GitLab" />}
            {filteredLinks.map((link) => (
              <LinkRow
                key={link.id}
                url={link.url}
                label={link.label}
                tags={link.tags}
                actions={
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(link.id)}
                    >
                      <Pencil className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="size-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will remove the &quot;{link.label}&quot; link.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(link.id)}
                            disabled={deletingId === link.id}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            {deletingId === link.id ? "Deleting…" : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                }
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

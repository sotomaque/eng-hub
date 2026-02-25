"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

export default function TemplatesPage() {
  const { userId } = useAuth();
  const trpc = useTRPC();
  const templatesQuery = useQuery(trpc.meetingTemplate.getAll.queryOptions());

  const deleteMutation = useMutation(
    trpc.meetingTemplate.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Template deleted");
        templatesQuery.refetch();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const templates = templatesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meeting Templates</h1>
        <Button asChild>
          <Link href="/me/templates/new">
            <Plus className="size-4" />
            New Template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <FileText className="text-muted-foreground mb-4 size-12" />
          <h2 className="text-lg font-semibold">No templates yet</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Create a template to use as a starting point for your 1:1 meetings.
          </p>
          <Button asChild>
            <Link href="/me/templates/new">
              <Plus className="size-4" />
              Create Template
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="group relative">
              <Link href={`/me/templates/${template.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </CardHeader>
              </Link>
              {template.authorId === userId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive absolute top-3 right-3 size-8 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => deleteMutation.mutate({ id: template.id })}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

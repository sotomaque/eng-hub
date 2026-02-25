"use client";

import { useMutation } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const TiptapEditor = dynamic(
  () =>
    import("@/components/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[250px] w-full animate-pulse rounded-lg border border-input bg-background" />
    ),
  },
);

import { useTRPC } from "@/lib/trpc/client";

interface TemplateFormProps {
  template?: {
    id: string;
    name: string;
    description: string | null;
    content: unknown;
  };
  readOnly?: boolean;
}

export function TemplateForm({ template, readOnly }: TemplateFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [content, setContent] = useState<JSONContent>((template?.content as JSONContent) ?? {});

  const createMutation = useMutation(
    trpc.meetingTemplate.create.mutationOptions({
      onSuccess: () => {
        toast.success("Template created");
        router.push("/me/templates");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.meetingTemplate.update.mutationOptions({
      onSuccess: () => {
        toast.success("Template updated");
        router.push("/me/templates");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (template) {
      updateMutation.mutate({
        id: template.id,
        name: name.trim(),
        description: description.trim() || undefined,
        content,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        content,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="size-8">
            <Link href="/me/templates">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">
            {readOnly
              ? (template?.name ?? "View Template")
              : template
                ? "Edit Template"
                : "New Template"}
          </h1>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={() => router.push("/me/templates")}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : template ? "Save Changes" : "Create Template"}
            </Button>
          </div>
        )}
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/30 p-4">
        <div className="min-w-[240px] flex-1 space-y-1.5">
          <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Template Name
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Weekly 1:1"
            required
            readOnly={readOnly}
            className="h-9 bg-background"
          />
        </div>
        <div className="min-w-[240px] flex-[2] space-y-1.5">
          <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            Description
          </Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of this template…"
            readOnly={readOnly}
            className="h-9 bg-background"
          />
        </div>
      </div>

      {/* Editor - full width */}
      <TiptapEditor
        initialContent={content}
        onChange={setContent}
        editable={!readOnly}
        className="min-h-[500px]"
      />
    </form>
  );
}

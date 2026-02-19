"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { notFound, useParams } from "next/navigation";
import { TemplateForm } from "@/components/template-form";
import { useTRPC } from "@/lib/trpc/client";

export default function EditTemplatePage() {
  const { userId } = useAuth();
  const params = useParams<{ templateId: string }>();
  const trpc = useTRPC();
  const templateQuery = useQuery(
    trpc.meetingTemplate.getById.queryOptions({ id: params.templateId }),
  );

  if (templateQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="text-muted-foreground size-6 animate-spin" />
      </div>
    );
  }

  if (!templateQuery.data) {
    notFound();
  }

  const isOwner = templateQuery.data.authorId === userId;

  return <TemplateForm template={templateQuery.data} readOnly={!isOwner} />;
}

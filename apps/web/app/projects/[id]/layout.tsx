import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/project-sidebar";
import { ProjectSiteHeader } from "@/components/project-site-header";
import { BreadcrumbProvider } from "@/lib/contexts/breadcrumb-context";
import { getCachedProject } from "@/lib/trpc/cached-queries";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const project = await getCachedProject(id);
  return {
    title: {
      default: project?.name ?? "Project",
      template: `%s - ${project?.name ?? "Project"}`,
    },
  };
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const [project, trpc] = await Promise.all([
    getCachedProject(id),
    createServerCaller(),
  ]);
  if (!project) notFound();
  const isFavorited = await trpc.project.isFavorited({ projectId: id });

  return (
    <SidebarProvider>
      <ProjectSidebar
        projectId={id}
        projectName={project.name}
        projectImageUrl={project.imageUrl}
        parentProject={project.parent ?? null}
        fundedByProject={project.fundedBy ?? null}
        isFavorited={isFavorited}
      />
      <SidebarInset>
        <BreadcrumbProvider>
          <ProjectSiteHeader projectId={id} projectName={project.name} />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </BreadcrumbProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}

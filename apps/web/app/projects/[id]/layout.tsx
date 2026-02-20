import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/project-sidebar";
import { ProjectSiteHeader } from "@/components/project-site-header";
import { getCachedProject } from "@/lib/trpc/cached-queries";

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
  const project = await getCachedProject(id);
  if (!project) notFound();

  return (
    <SidebarProvider>
      <ProjectSidebar
        projectId={id}
        projectName={project.name}
        projectImageUrl={project.imageUrl}
      />
      <SidebarInset>
        <ProjectSiteHeader projectId={id} projectName={project.name} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

import {
  SidebarInset,
  SidebarProvider,
} from "@workspace/ui/components/sidebar";
import { notFound } from "next/navigation";
import { ProjectSidebar } from "@/components/project-sidebar";
import { ProjectSiteHeader } from "@/components/project-site-header";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const trpc = await createServerCaller();
  const project = await trpc.project.getById({ id });
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

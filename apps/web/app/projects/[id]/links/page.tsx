import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LinksSection } from "@/components/links-section";
import { ProjectLinkSheet } from "@/components/project-link-sheet";
import { createServerCaller } from "@/lib/trpc/server";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    addLink?: string;
    editLink?: string;
  }>;
}

async function LinksContent({ id }: { id: string }) {
  const trpc = await createServerCaller();
  const project = await trpc.project.getById({ id });
  if (!project) notFound();

  return (
    <LinksSection
      projectId={id}
      links={project.links}
      githubUrl={project.githubUrl}
      gitlabUrl={project.gitlabUrl}
    />
  );
}

async function EditLinkContent({
  projectId,
  linkId,
}: {
  projectId: string;
  linkId: string;
}) {
  const trpc = await createServerCaller();
  const link = await trpc.projectLink.getById({ id: linkId });
  if (!link) return null;
  return <ProjectLinkSheet projectId={projectId} link={link} />;
}

export default async function LinksPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={null}>
        <LinksContent id={id} />
      </Suspense>

      {sp.addLink === "true" && <ProjectLinkSheet projectId={id} />}
      {sp.editLink && (
        <Suspense fallback={null}>
          <EditLinkContent projectId={id} linkId={sp.editLink} />
        </Suspense>
      )}
    </>
  );
}

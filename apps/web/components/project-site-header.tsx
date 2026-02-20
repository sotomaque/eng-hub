"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb";
import { Separator } from "@workspace/ui/components/separator";
import { SidebarTrigger } from "@workspace/ui/components/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProjectSiteHeaderProps {
  projectName: string;
  projectId: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  health: "Health",
  team: "People",
  "org-chart": "Org Chart",
  roadmap: "Roadmap",
  links: "Links",
  arrangements: "Teams",
  stats: "Stats",
};

export function ProjectSiteHeader({
  projectName,
  projectId,
}: ProjectSiteHeaderProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  // Determine the active section from the pathname
  const relativePath = pathname.replace(basePath, "").replace(/^\//, "");
  const segments = relativePath.split("/").filter(Boolean);
  const sectionSlug = segments[0];
  const sectionLabel = sectionSlug ? SEGMENT_LABELS[sectionSlug] : undefined;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          {sectionLabel ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={basePath}>{projectName}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{sectionLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage>{projectName}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

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

const SEGMENT_LABELS: Record<string, string> = {
  "direct-reports": "Direct Reports",
  "one-on-ones": "1:1 Meetings",
  templates: "Templates",
  new: "New",
};

export function MeSiteHeader() {
  const pathname = usePathname();
  const relativePath = pathname.replace("/me", "").replace(/^\//, "");
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
              <Link href="/me">My Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {sectionLabel && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{sectionLabel}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}

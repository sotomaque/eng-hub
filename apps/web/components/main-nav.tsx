"use client";

import { useUser } from "@clerk/nextjs";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const links = [
  { href: "/", label: "Home" },
  { href: "/projects", label: "Projects" },
  { href: "/people", label: "People" },
  { href: "/org-chart", label: "Org Chart" },
  { href: "/settings", label: "Departments & Titles" },
];

export function MainNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  const visibleLinks = isAdmin ? [...links, { href: "/admin", label: "Admin" }] : links;

  return (
    <nav className="hidden items-center gap-4 md:flex">
      {visibleLinks.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-medium transition-colors hover:text-foreground",
              isActive ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

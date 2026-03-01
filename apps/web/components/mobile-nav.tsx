"use client";

import { useUser } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { links } from "@/components/main-nav";

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const isAdmin = (user?.publicMetadata as { role?: string } | undefined)?.role === "admin";

  const visibleLinks = isAdmin ? [...links, { href: "/admin", label: "Admin" }] : links;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>
            <Link href="/" className="text-xl font-bold">
              Eng Hub
            </Link>
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-2">
          {visibleLinks.map((link) => {
            const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <SheetClose key={link.href} asChild>
                <Link
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                    isActive ? "bg-accent text-foreground" : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              </SheetClose>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

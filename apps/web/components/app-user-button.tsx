"use client";

import { useAuthSession, useSignOut } from "@workspace/auth/client";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { LayoutDashboard, LogOut, Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";

const themeOrder = ["light", "dark", "system"] as const;
type ThemeKey = (typeof themeOrder)[number];

const themeConfig: Record<ThemeKey, { icon: React.ReactNode; label: string }> = {
  light: { icon: <Sun className="size-4" />, label: "Theme: Light" },
  dark: { icon: <Moon className="size-4" />, label: "Theme: Dark" },
  system: { icon: <Monitor className="size-4" />, label: "Theme: System" },
};

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
      {children}
    </div>
  );
}

export function AppUserButton() {
  const { isLoaded, userId, name, email, imageUrl } = useAuthSession();
  const signOut = useSignOut();
  const { theme, setTheme } = useTheme();

  const current = (theme ?? "system") as ThemeKey;
  const nextIndex = (themeOrder.indexOf(current) + 1) % themeOrder.length;
  const nextTheme = themeOrder[nextIndex] ?? "system";

  if (!isLoaded || !userId) return null;

  const displayName = name ?? email ?? "Account";
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 rounded-full p-0"
          aria-label="Open user menu"
        >
          <Avatar className="size-8">
            <AvatarImage src={imageUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 p-0">
        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar className="size-11">
            <AvatarImage src={imageUrl ?? undefined} alt={displayName} />
            <AvatarFallback className="text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium text-sm leading-tight">{displayName}</span>
            {email && name && (
              <span className="mt-0.5 truncate text-muted-foreground text-xs">{email}</span>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="p-1.5">
          <DropdownMenuItem asChild className="gap-3 rounded-md px-2 py-2 focus:bg-accent">
            <Link href="/me" className="cursor-pointer">
              <IconBox>
                <LayoutDashboard className="size-4" />
              </IconBox>
              <span className="text-sm">My Dashboard</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme(nextTheme)}
            className="gap-3 rounded-md px-2 py-2 focus:bg-accent"
          >
            <IconBox>{themeConfig[current].icon}</IconBox>
            <span className="text-sm">{themeConfig[current].label}</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => signOut()}
            className="gap-3 rounded-md px-2 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <IconBox>
              <LogOut className="size-4" />
            </IconBox>
            <span className="text-sm">Sign out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { AppUserButton } from "@/components/app-user-button";
import { MainNav } from "@/components/main-nav";

export function AppHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold">
            Eng Hub
          </Link>
          <MainNav />
        </div>
        <div className="flex items-center gap-2">
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <AppUserButton />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}

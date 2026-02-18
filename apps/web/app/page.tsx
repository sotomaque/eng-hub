import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@workspace/ui/components/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Eng Hub</h1>
      <p className="text-muted-foreground text-lg">
        Engineering project management dashboard
      </p>
      <SignedOut>
        <SignInButton mode="modal">
          <Button>Get Started</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <div className="flex items-center gap-4">
          <UserButton />
          <p className="text-muted-foreground text-sm">You're signed in</p>
        </div>
      </SignedIn>
    </main>
  );
}

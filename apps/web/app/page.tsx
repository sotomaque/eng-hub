import { Button } from "@workspace/ui/components/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold tracking-tight">Eng Hub</h1>
      <p className="text-muted-foreground text-lg">
        Engineering project management dashboard
      </p>
      <Button>Get Started</Button>
    </main>
  );
}

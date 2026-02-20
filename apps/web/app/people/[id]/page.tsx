import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppHeader } from "@/components/app-header";
import { PersonComments } from "@/components/person-comments";
import { PersonProfile } from "@/components/person-profile";
import { PersonProfileSkeleton } from "@/components/person-profile-skeleton";
import { getCachedPerson } from "./_lib/queries";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function PersonContent({ id }: { id: string }) {
  const person = await getCachedPerson(id);
  if (!person) notFound();

  return <PersonProfile person={person} />;
}

export default async function PersonPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<PersonProfileSkeleton />}>
          <PersonContent id={id} />
        </Suspense>
        <PersonComments personId={id} />
      </main>
    </div>
  );
}

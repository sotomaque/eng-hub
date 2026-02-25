import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { getMe } from "@/app/me/_lib/queries";
import { AppHeader } from "@/components/app-header";
import { PersonComments } from "@/components/person-comments";
import { PersonMeetings } from "@/components/person-meetings";
import { PersonProfile } from "@/components/person-profile";
import { PersonProfileSkeleton } from "@/components/person-profile-skeleton";
import { getCachedPerson } from "./_lib/queries";

function serializeDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return typeof date === "string" ? date : date.toISOString();
}

type PageProps = {
  params: Promise<{ id: string }>;
};

async function PersonContent({ id }: { id: string }) {
  // Run both fetches concurrently — getMe() is React.cache()-deduped so no extra DB call
  const [me, person] = await Promise.all([getMe(), getCachedPerson(id)]);

  if (me?.id === id) redirect("/me");
  if (!person) notFound();

  return (
    <PersonProfile
      person={{
        ...person,
        milestoneAssignments: person.milestoneAssignments.map((a) => ({
          milestone: { ...a.milestone, targetDate: serializeDate(a.milestone.targetDate) },
        })),
        quarterlyGoalAssignments: person.quarterlyGoalAssignments.map((a) => ({
          quarterlyGoal: {
            ...a.quarterlyGoal,
            targetDate: serializeDate(a.quarterlyGoal.targetDate),
          },
        })),
      }}
    />
  );
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
        <PersonMeetings personId={id} />
        <PersonComments personId={id} />
      </main>
    </div>
  );
}

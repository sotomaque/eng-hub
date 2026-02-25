import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonProfile } from "@/components/person-profile";
import { PersonProfileSkeleton } from "@/components/person-profile-skeleton";
import { getMe } from "./_lib/queries";

export const metadata: Metadata = { title: "My Dashboard" };

function serializeDate(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  return typeof date === "string" ? date : date.toISOString();
}

async function MeContent() {
  const person = await getMe();

  if (!person) {
    redirect("/people");
  }

  return (
    <PersonProfile
      hideBackLink
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

export default function MeProfilePage() {
  return (
    <Suspense fallback={<PersonProfileSkeleton />}>
      <MeContent />
    </Suspense>
  );
}

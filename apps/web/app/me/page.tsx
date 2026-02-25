import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PersonProfile } from "@/components/person-profile";
import { PersonProfileSkeleton } from "@/components/person-profile-skeleton";
import { getMe } from "./_lib/queries";

export const metadata: Metadata = { title: "My Dashboard" };

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
          milestone: {
            ...a.milestone,
            targetDate: a.milestone.targetDate
              ? typeof a.milestone.targetDate === "string"
                ? a.milestone.targetDate
                : a.milestone.targetDate.toISOString()
              : null,
          },
        })),
        quarterlyGoalAssignments: person.quarterlyGoalAssignments.map((a) => ({
          quarterlyGoal: {
            ...a.quarterlyGoal,
            targetDate: a.quarterlyGoal.targetDate
              ? typeof a.quarterlyGoal.targetDate === "string"
                ? a.quarterlyGoal.targetDate
                : a.quarterlyGoal.targetDate.toISOString()
              : null,
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

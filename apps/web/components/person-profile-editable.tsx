"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AddToProjectDialog } from "@/components/add-to-project-dialog";
import { type PersonData, PersonProfile } from "@/components/person-profile";
import { PersonSheet } from "@/components/person-sheet";
import { useTRPC } from "@/lib/trpc/client";

type PersonProfileEditableProps = {
  person: PersonData;
  hideBackLink?: boolean;
};

export function PersonProfileEditable({ person, hideBackLink }: PersonProfileEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingToProject, setIsAddingToProject] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const queryOptions = trpc.person.getForEdit.queryOptions({ id: person.id });
  const { data: editData } = useQuery({
    ...queryOptions,
    enabled: isEditing || isAddingToProject,
  });

  function handleClose() {
    setIsEditing(false);
    queryClient.invalidateQueries({ queryKey: queryOptions.queryKey });
    router.refresh();
  }

  function handleAddToProjectClose() {
    setIsAddingToProject(false);
    router.refresh();
  }

  return (
    <>
      <PersonProfile
        person={person}
        hideBackLink={hideBackLink}
        onEdit={() => setIsEditing(true)}
      />
      {isEditing && editData && (
        <PersonSheet
          person={editData}
          onClose={handleClose}
          onAddToProject={() => {
            setIsEditing(false);
            setIsAddingToProject(true);
          }}
        />
      )}
      {isAddingToProject && editData && (
        <AddToProjectDialog
          personId={person.id}
          personName={`${person.firstName} ${person.lastName}`}
          existingProjectIds={editData.projectMemberships.map((m) => m.projectId)}
          onClose={handleAddToProjectClose}
        />
      )}
    </>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type PersonData, PersonProfile } from "@/components/person-profile";
import { PersonSheet } from "@/components/person-sheet";
import { useTRPC } from "@/lib/trpc/client";

type PersonProfileEditableProps = {
  person: PersonData;
  hideBackLink?: boolean;
};

export function PersonProfileEditable({ person, hideBackLink }: PersonProfileEditableProps) {
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const trpc = useTRPC();

  const { data: editData } = useQuery({
    ...trpc.person.getForEdit.queryOptions({ id: person.id }),
    enabled: isEditing,
  });

  function handleClose() {
    setIsEditing(false);
    router.refresh();
  }

  return (
    <>
      <PersonProfile
        person={person}
        hideBackLink={hideBackLink}
        onEdit={() => setIsEditing(true)}
      />
      {isEditing && editData && <PersonSheet person={editData} onClose={handleClose} />}
    </>
  );
}

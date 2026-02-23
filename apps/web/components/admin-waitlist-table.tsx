"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

interface UnlinkedPerson {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl: string | null;
}

export function AdminWaitlistTable() {
  const trpc = useTRPC();

  const waitlistQuery = useQuery(
    trpc.admin.waitlistList.queryOptions({ status: "pending" }),
  );
  const unlinkedQuery = useQuery(trpc.admin.unlinkedPeople.queryOptions());

  const approveMutation = useMutation(
    trpc.admin.waitlistApprove.mutationOptions({
      onSuccess: () => {
        toast.success("Waitlist entry approved");
        waitlistQuery.refetch();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const rejectMutation = useMutation(
    trpc.admin.waitlistReject.mutationOptions({
      onSuccess: () => {
        toast.success("Waitlist entry rejected");
        waitlistQuery.refetch();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const [approveDialog, setApproveDialog] = useState<{
    id: string;
    email: string;
  } | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);

  const entries = waitlistQuery.data?.entries ?? [];
  const unlinked = unlinkedQuery.data ?? [];

  function handleApprove() {
    if (!approveDialog) return;
    approveMutation.mutate({
      waitlistEntryId: approveDialog.id,
      email: approveDialog.email,
      personId: selectedPersonId ?? undefined,
    });
    setApproveDialog(null);
    setSelectedPersonId(null);
  }

  if (waitlistQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading waitlist...</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pending waitlist entries.
      </p>
    );
  }

  const selectedPerson = unlinked.find((p) => p.id === selectedPersonId);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="w-[200px]">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-medium">
                  {entry.emailAddress}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setApproveDialog({
                          id: entry.id,
                          email: entry.emailAddress,
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        rejectMutation.mutate({
                          waitlistEntryId: entry.id,
                        })
                      }
                      disabled={rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={approveDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setApproveDialog(null);
            setSelectedPersonId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve waitlist entry</DialogTitle>
            <DialogDescription>
              Approving <strong>{approveDialog?.email}</strong> will send them
              an invitation email. Optionally link to an existing Person record
              so their account is pre-configured on signup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">Link to Person (optional)</p>
            <PersonCombobox
              people={unlinked}
              value={selectedPersonId}
              onChange={setSelectedPersonId}
              open={comboOpen}
              onOpenChange={setComboOpen}
            />
            {selectedPerson && (
              <p className="text-xs text-muted-foreground">
                {selectedPerson.firstName} {selectedPerson.lastName} (
                {selectedPerson.email})
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialog(null);
                setSelectedPersonId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PersonCombobox({
  people,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  people: UnlinkedPerson[];
  value: string | null;
  onChange: (id: string | null) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const selected = people.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {selected
              ? `${selected.firstName} ${selected.lastName}`
              : "Select a person..."}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search people..." />
          <CommandList>
            <CommandEmpty>No unlinked people found.</CommandEmpty>
            <CommandGroup>
              {people.map((person) => (
                <CommandItem
                  key={person.id}
                  value={`${person.firstName} ${person.lastName} ${person.email}`}
                  onSelect={() => {
                    onChange(value === person.id ? null : person.id);
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4 shrink-0",
                      value === person.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <Avatar className="mr-2 size-6 shrink-0">
                    <AvatarImage src={person.imageUrl ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {person.firstName[0]}
                      {person.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="truncate">
                      {person.firstName} {person.lastName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {person.email}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

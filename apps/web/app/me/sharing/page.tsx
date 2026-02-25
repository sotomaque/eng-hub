"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { Loader2, Share2, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

const EMPTY_GRANTS: Grant[] = [];
const EMPTY_PEOPLE: Person[] = [];

interface Grant {
  id: string;
  granteeId: string;
  createdAt: string;
  grantee: {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string | null;
  };
}

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
}

export default function SharingPage() {
  const trpc = useTRPC();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const grantsQuery = useQuery(trpc.meeting.getMyGrants.queryOptions());
  const peopleQuery = useQuery(trpc.person.getAll.queryOptions());
  const meQuery = useQuery(trpc.person.me.queryOptions());

  const grantMutation = useMutation(
    trpc.meeting.grantVisibility.mutationOptions({
      onSuccess: () => {
        toast.success("Access granted");
        grantsQuery.refetch();
        setPopoverOpen(false);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const revokeMutation = useMutation(
    trpc.meeting.revokeVisibility.mutationOptions({
      onSuccess: () => {
        toast.success("Access revoked");
        grantsQuery.refetch();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const grants = (grantsQuery.data as Grant[] | undefined) ?? EMPTY_GRANTS;
  const allPeople = (peopleQuery.data as Person[] | undefined) ?? EMPTY_PEOPLE;
  const myId = meQuery.data?.id;

  const granteeIds = useMemo(() => new Set(grants.map((g) => g.grantee.id)), [grants]);

  const availablePeople = useMemo(
    () => allPeople.filter((p) => p.id !== myId && !granteeIds.has(p.id)),
    [allPeople, myId, granteeIds],
  );

  const hasDirectReports = (meQuery.data?.directReports?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meeting Note Sharing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Control who can view your direct reports&apos; 1:1 meeting notes on their profile pages.
          People in your management chain already have access by default.
        </p>
      </div>

      {!hasDirectReports ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Share2 className="text-muted-foreground mb-4 size-12" />
            <h2 className="text-lg font-semibold">No direct reports</h2>
            <p className="text-muted-foreground text-sm">
              Sharing is available when you have direct reports with meeting notes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Shared With</CardTitle>
                <CardDescription>
                  These people can view your direct reports&apos; 1:1 notes.
                </CardDescription>
              </div>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="size-4" />
                    Add Person
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search people..." />
                    <CommandList>
                      <CommandEmpty>No people found.</CommandEmpty>
                      <CommandGroup>
                        {availablePeople.map((person: Person) => (
                          <CommandItem
                            key={person.id}
                            value={`${person.firstName} ${person.lastName}`}
                            onSelect={() => grantMutation.mutate({ granteeId: person.id })}
                          >
                            <Avatar className="mr-2 size-6 shrink-0">
                              <AvatarImage src={person.imageUrl ?? undefined} />
                              <AvatarFallback className="text-xs">
                                {person.firstName[0]}
                                {person.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">
                              {person.firstName} {person.lastName}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            {grants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Share2 className="text-muted-foreground mb-2 size-8" />
                <p className="text-muted-foreground text-sm">
                  You haven&apos;t shared access with anyone yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {grants.map((grant) => (
                  <div
                    key={grant.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage
                          src={grant.grantee.imageUrl ?? undefined}
                          alt={`${grant.grantee.firstName} ${grant.grantee.lastName}`}
                        />
                        <AvatarFallback className="text-xs">
                          {grant.grantee.firstName[0]}
                          {grant.grantee.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {grant.grantee.firstName} {grant.grantee.lastName}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive size-8"
                      onClick={() => revokeMutation.mutate({ granteeId: grant.grantee.id })}
                      disabled={revokeMutation.isPending}
                    >
                      {revokeMutation.isPending &&
                      revokeMutation.variables?.granteeId === grant.grantee.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                      <span className="sr-only">Revoke access</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

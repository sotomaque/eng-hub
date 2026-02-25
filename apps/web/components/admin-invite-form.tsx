"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

export function AdminInviteForm() {
  const trpc = useTRPC();
  const [email, setEmail] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [comboOpen, setComboOpen] = useState(false);

  const unlinkedQuery = useQuery(trpc.admin.unlinkedPeople.queryOptions());
  const unlinked = unlinkedQuery.data ?? [];
  const selectedPerson = unlinked.find((p) => p.id === personId);

  const inviteMutation = useMutation(
    trpc.admin.invite.mutationOptions({
      onSuccess: () => {
        toast.success(`Invitation sent to ${email}`);
        setEmail("");
        setPersonId(null);
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMutation.mutate({
      email: email.trim(),
      personId: personId ?? undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="invite-email">Email address</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="user@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Link to Person (optional)</Label>
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              type="button"
              aria-expanded={comboOpen}
              className={cn(
                "w-full justify-between font-normal",
                !personId && "text-muted-foreground",
              )}
            >
              <span className="truncate">
                {selectedPerson
                  ? `${selectedPerson.firstName} ${selectedPerson.lastName}`
                  : "Select a person..."}
              </span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search people..." />
              <CommandList>
                <CommandEmpty>No unlinked people found.</CommandEmpty>
                <CommandGroup>
                  {unlinked.map((person) => (
                    <CommandItem
                      key={person.id}
                      value={`${person.firstName} ${person.lastName} ${person.email}`}
                      onSelect={() => {
                        setPersonId(personId === person.id ? null : person.id);
                        setComboOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4 shrink-0",
                          personId === person.id ? "opacity-100" : "opacity-0",
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
        {selectedPerson && (
          <p className="text-xs text-muted-foreground">
            Will auto-link {selectedPerson.firstName} {selectedPerson.lastName} when they sign up.
          </p>
        )}
      </div>

      <Button type="submit" disabled={inviteMutation.isPending || !email.trim()}>
        {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
      </Button>
    </form>
  );
}

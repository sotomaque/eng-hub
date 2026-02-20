"use client";

import { useQuery } from "@tanstack/react-query";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";

interface PersonMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

export function PersonMultiSelect({
  value,
  onChange,
  placeholder = "Assign people…",
}: PersonMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const peopleQuery = useQuery(trpc.person.getAll.queryOptions());

  const people = peopleQuery.data ?? [];

  const selectedPeople = useMemo(
    () => people.filter((p) => value.includes(p.id)),
    [people, value],
  );

  const selectedSet = useMemo(() => new Set(value), [value]);

  function togglePerson(personId: string) {
    if (selectedSet.has(personId)) {
      onChange(value.filter((id) => id !== personId));
    } else {
      onChange([...value, personId]);
    }
  }

  function removePerson(personId: string) {
    onChange(value.filter((id) => id !== personId));
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              value.length === 0 && "text-muted-foreground",
            )}
          >
            <span className="truncate">
              {value.length > 0
                ? `${value.length} ${value.length === 1 ? "person" : "people"} assigned`
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Search people…" />
            <CommandList>
              <CommandEmpty>No people found.</CommandEmpty>
              <CommandGroup>
                {people.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={`${person.firstName} ${person.lastName}`}
                    onSelect={() => togglePerson(person.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4 shrink-0",
                        selectedSet.has(person.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
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

      {selectedPeople.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedPeople.map((person) => (
            <span
              key={person.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
            >
              <Avatar className="size-4">
                <AvatarImage src={person.imageUrl ?? undefined} />
                <AvatarFallback className="text-[8px]">
                  {person.firstName[0]}
                  {person.lastName[0]}
                </AvatarFallback>
              </Avatar>
              {person.firstName} {person.lastName}
              <button
                type="button"
                onClick={() => removePerson(person.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="size-3" />
                <span className="sr-only">Remove</span>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
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
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover";
import { cn } from "@workspace/ui/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTRPC } from "@/lib/trpc/client";

type PersonSelectProps = {
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
};

export function PersonSelect({
  value,
  onChange,
  placeholder = "Select person…",
}: PersonSelectProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();
  const peopleQuery = useQuery(trpc.person.getAll.queryOptions());

  const people = peopleQuery.data ?? [];

  const selected = useMemo(() => people.find((p) => p.id === value), [people, value]);

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-expanded={open}
            className={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
          >
            <span className="truncate">
              {selected ? `${selected.firstName} ${selected.lastName}` : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search people…" />
            <CommandList>
              <CommandEmpty>No people found.</CommandEmpty>
              <CommandGroup>
                {people.map((person) => (
                  <CommandItem
                    key={person.id}
                    value={`${person.firstName} ${person.lastName}`}
                    onSelect={() => {
                      onChange(person.id === value ? null : person.id);
                      setOpen(false);
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
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => onChange(null)}
        >
          <X className="size-3.5" />
          <span className="sr-only">Clear reviewer</span>
        </Button>
      ) : null}
    </div>
  );
}

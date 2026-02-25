"use client";

import { Badge } from "@workspace/ui/components/badge";
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
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

import { getTagColor } from "@/lib/tag-colors";

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions: string[];
  placeholder?: string;
};

export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder = "Add tags...",
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const trimmed = search.trim();
  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(trimmed.toLowerCase()),
  );
  const exactMatch = suggestions.some((s) => s.toLowerCase() === trimmed.toLowerCase());
  const alreadySelected = value.some((v) => v.toLowerCase() === trimmed.toLowerCase());
  const showCreate = trimmed.length > 0 && !exactMatch && !alreadySelected;

  function addTag(tag: string) {
    const t = tag.trim();
    if (t && !value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      onChange([...value, t]);
    }
    setSearch("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} className={cn("gap-1 border-0 px-2 py-0.5", getTagColor(tag))}>
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "border-input bg-background ring-offset-background flex h-9 w-full items-center rounded-md border px-3 text-sm",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
            onClick={() => setOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            {placeholder}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search or create..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                {trimmed
                  ? "No matching tags. Press enter to create."
                  : "Type to search or create a tag."}
              </CommandEmpty>
              {filtered.length > 0 && (
                <CommandGroup heading="Existing">
                  {filtered.map((tag) => (
                    <CommandItem
                      key={tag}
                      onSelect={() => {
                        addTag(tag);
                        setOpen(false);
                      }}
                    >
                      <Check className="size-4 shrink-0 opacity-0" />
                      <Badge className={cn("border-0 px-2 py-0", getTagColor(tag))}>{tag}</Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {showCreate && (
                <CommandGroup heading="Create">
                  <CommandItem
                    onSelect={() => {
                      addTag(trimmed);
                      setOpen(false);
                    }}
                  >
                    <Plus className="size-4 shrink-0" />
                    Create &quot;{trimmed}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

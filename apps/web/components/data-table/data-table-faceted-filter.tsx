"use client";

import type { Column } from "@tanstack/react-table";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { Separator } from "@workspace/ui/components/separator";
import { cn } from "@workspace/ui/lib/utils";
import { Check, PlusCircle } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title: string;
  options: FilterOption[];
  /** Controlled mode: current selected values */
  value?: string[];
  /** Controlled mode: called when selection changes */
  onValueChange?: (values: string[]) => void;
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
  value,
  onValueChange,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const controlled = onValueChange !== undefined;
  const filterValue = controlled
    ? (value ?? [])
    : ((column?.getFilterValue() as string[]) ?? []);
  const selectedValues = new Set(filterValue);

  function toggleValue(val: string) {
    const next = new Set(selectedValues);
    if (next.has(val)) {
      next.delete(val);
    } else {
      next.add(val);
    }
    const arr = Array.from(next);
    if (controlled) {
      onValueChange(arr);
    } else {
      column?.setFilterValue(arr.length > 0 ? arr : undefined);
    }
  }

  function clearAll() {
    if (controlled) {
      onValueChange([]);
    } else {
      column?.setFilterValue(undefined);
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <PlusCircle className="mr-2 size-4" />
          {title}
          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {selectedValues.size}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="space-y-1">
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value);
            return (
              <button
                type="button"
                key={option.value}
                onClick={() => toggleValue(option.value)}
                className={cn(
                  "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                  isSelected && "font-medium",
                )}
              >
                <div
                  className={cn(
                    "mr-2 flex size-4 items-center justify-center rounded-sm border border-primary",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50",
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </div>
                {option.label}
              </button>
            );
          })}
        </div>
        {selectedValues.size > 0 && (
          <>
            <Separator className="my-2" />
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={clearAll}
            >
              Clear filters
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

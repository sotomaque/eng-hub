import { cn } from "@workspace/ui/lib/utils";
import type * as React from "react";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"hr"> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <hr
      data-slot="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 border-none bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };

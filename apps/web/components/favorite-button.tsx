"use client";

import { useMutation } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/button";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "@/lib/trpc/client";

interface FavoriteButtonProps {
  projectId: string;
  isFavorited: boolean;
  size?: "sm" | "default";
}

export function FavoriteButton({
  projectId,
  isFavorited,
  size = "sm",
}: FavoriteButtonProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [optimistic, setOptimistic] = useState(isFavorited);

  const toggleMutation = useMutation(
    trpc.project.toggleFavorite.mutationOptions({
      onMutate: () => {
        setOptimistic((prev) => !prev);
      },
      onSuccess: (data) => {
        setOptimistic(data.favorited);
        router.refresh();
      },
      onError: () => {
        setOptimistic(isFavorited);
      },
    }),
  );

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={size === "sm" ? "size-7 shrink-0" : "size-8 shrink-0"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleMutation.mutate({ projectId });
      }}
      disabled={toggleMutation.isPending}
    >
      <Star
        className={
          optimistic
            ? "size-4 fill-yellow-400 text-yellow-400"
            : "size-4 text-muted-foreground"
        }
      />
      <span className="sr-only">
        {optimistic ? "Remove from favorites" : "Add to favorites"}
      </span>
    </Button>
  );
}

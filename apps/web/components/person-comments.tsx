"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2, MessageSquare, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

interface PersonCommentsProps {
  personId: string;
}

interface Comment {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string | null;
  };
}

function formatRelativeTime(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function PersonComments({ personId }: PersonCommentsProps) {
  const trpc = useTRPC();
  const [newContent, setNewContent] = useState("");

  const commentsQuery = useQuery(
    trpc.personComment.getByPersonId.queryOptions({ personId }),
  );
  const meQuery = useQuery(trpc.person.me.queryOptions());

  const createMutation = useMutation(
    trpc.personComment.create.mutationOptions({
      onSuccess: () => {
        setNewContent("");
        commentsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.personComment.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Note deleted");
        commentsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const comments: Comment[] = (commentsQuery.data as Comment[]) ?? [];
  const me = meQuery.data;
  const canComment = me?.clerkUserId != null;

  function handleSubmit() {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    createMutation.mutate({ personId, content: trimmed });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>Notes</CardTitle>
          {comments.length > 0 && (
            <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
              {comments.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {canComment ? (
          <div className="flex gap-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={me.imageUrl ?? undefined} />
              <AvatarFallback className="text-xs">
                {me.firstName[0]}
                {me.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Add a note..."
                className="min-h-20 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSubmit();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span
                  className="text-muted-foreground text-xs"
                  suppressHydrationWarning
                >
                  Press{" "}
                  {typeof navigator !== "undefined" &&
                  navigator.platform?.includes("Mac")
                    ? "\u2318"
                    : "Ctrl"}
                  +Enter to submit
                </span>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={
                    createMutation.isPending || newContent.trim().length === 0
                  }
                >
                  {createMutation.isPending && (
                    <span className="animate-spin">
                      <Loader2 />
                    </span>
                  )}
                  Post
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Claim your profile to leave notes.
          </p>
        )}

        {comments.length > 0 && <Separator />}

        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <MessageSquare className="text-muted-foreground mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              No notes yet. Be the first to add one.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isAuthor={comment.authorId === me?.clerkUserId}
              onDelete={() => deleteMutation.mutate({ id: comment.id })}
              isDeleting={
                deleteMutation.isPending &&
                deleteMutation.variables?.id === comment.id
              }
              onUpdated={() => commentsQuery.refetch()}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CommentItem({
  comment,
  isAuthor,
  onDelete,
  isDeleting,
  onUpdated,
}: {
  comment: Comment;
  isAuthor: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  onUpdated: () => void;
}) {
  const trpc = useTRPC();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  const updateMutation = useMutation(
    trpc.personComment.update.mutationOptions({
      onSuccess: () => {
        toast.success("Note updated");
        setIsEditing(false);
        onUpdated();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleSave() {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === comment.content) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate({ id: comment.id, content: trimmed });
  }

  const authorName = `${comment.author.firstName} ${comment.author.lastName}`;
  const authorInitials = `${comment.author.firstName[0]}${comment.author.lastName[0]}`;

  return (
    <div className="flex gap-3">
      <Avatar className="size-8 shrink-0">
        <AvatarImage
          src={comment.author.imageUrl ?? undefined}
          alt={authorName}
        />
        <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-muted-foreground text-xs">
            {formatRelativeTime(comment.createdAt)}
          </span>
          {isAuthor && !isEditing && (
            <div className="ml-auto flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={() => {
                  setEditContent(comment.content);
                  setIsEditing(true);
                }}
              >
                <Pencil className="size-3" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={onDelete}
                disabled={isDeleting}
              >
                <Trash2 className="size-3" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-20 resize-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSave();
                }
                if (e.key === "Escape") {
                  setIsEditing(false);
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending && (
                  <span className="animate-spin">
                    <Loader2 />
                  </span>
                )}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
        )}
      </div>
    </div>
  );
}

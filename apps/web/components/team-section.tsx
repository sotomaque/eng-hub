"use client";

import type { TeamMember } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

interface TeamSectionProps {
  projectId: string;
  members: TeamMember[];
}

export function TeamSection({ projectId, members }: TeamSectionProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteMutation = useMutation(
    trpc.teamMember.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Team member removed");
        router.refresh();
      },
      onError: (error) => {
        toast.error(error.message);
      },
      onSettled: () => setDeletingId(null),
    }),
  );

  function handleAdd() {
    router.push(`/projects/${projectId}?addMember=true`, { scroll: false });
  }

  function handleEdit(id: string) {
    router.push(`/projects/${projectId}?editMember=${id}`, { scroll: false });
  }

  function handleDelete(id: string) {
    setDeletingId(id);
    deleteMutation.mutate({ id });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Team</CardTitle>
            <span className="text-muted-foreground rounded-md bg-muted px-2 py-0.5 text-sm font-medium">
              {members.length}
            </span>
          </div>
          <Button onClick={handleAdd} size="sm">
            <Plus className="size-4" />
            <span className="hidden sm:inline">Add Member</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="text-muted-foreground mb-2 size-8" />
            <p className="text-muted-foreground text-sm">
              No team members yet. Add members to track your project team.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">GitHub</TableHead>
                  <TableHead className="hidden md:table-cell">GitLab</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {member.email}
                    </TableCell>
                    <TableCell>{member.role}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {member.githubUsername || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {member.gitlabUsername || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(member.id)}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="size-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove team member?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This will remove &quot;{member.name}&quot; from
                                the project team.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(member.id)}
                                disabled={deletingId === member.id}
                                className="bg-destructive text-white hover:bg-destructive/90"
                              >
                                {deletingId === member.id
                                  ? "Removing..."
                                  : "Remove"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

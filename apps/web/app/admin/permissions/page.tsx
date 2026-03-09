"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

export default function PermissionsPage() {
  const trpc = useTRPC();
  const grantsQuery = useQuery(trpc.access.listGrants.queryOptions({}));
  const profilesQuery = useQuery(trpc.access.listProfiles.queryOptions());
  const peopleQuery = useQuery(trpc.person.getAll.queryOptions());

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState("");

  const assignMutation = useMutation(
    trpc.access.assignProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile assigned");
        grantsQuery.refetch();
        setAssignOpen(false);
        setSelectedPersonId("");
        setSelectedProfileId("");
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const removeMutation = useMutation(
    trpc.access.removeGrant.mutationOptions({
      onSuccess: () => {
        toast.success("Grant removed");
        grantsQuery.refetch();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const grants = grantsQuery.data ?? [];
  const profiles = profilesQuery.data ?? [];
  const people = peopleQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Manage access profiles and grants for all users.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/permissions/profiles">Manage Profiles</Link>
          </Button>
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 size-4" />
                Assign Profile
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Profile</DialogTitle>
                <DialogDescription>Grant an access profile to a person.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Person</Label>
                  <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {people.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Profile</Label>
                  <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a profile" />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() =>
                    assignMutation.mutate({
                      personId: selectedPersonId,
                      profileId: selectedProfileId,
                    })
                  }
                  disabled={!selectedPersonId || !selectedProfileId || assignMutation.isPending}
                >
                  {assignMutation.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Person</TableHead>
            <TableHead>Profile</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {grants.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No grants found.
              </TableCell>
            </TableRow>
          ) : (
            grants.map((grant) => (
              <TableRow key={grant.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarImage src={grant.person.imageUrl ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {grant.person.firstName[0]}
                        {grant.person.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {grant.person.firstName} {grant.person.lastName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{grant.profile.name}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {grant.project ? grant.project.name : "Global"}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMutation.mutate({ id: grant.id })}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

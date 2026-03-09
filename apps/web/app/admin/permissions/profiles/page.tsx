"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Textarea } from "@workspace/ui/components/textarea";
import { ArrowLeft, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

type ProfileForm = {
  name: string;
  description: string;
  capabilities: string[];
  isDefault: boolean;
};

const emptyForm: ProfileForm = {
  name: "",
  description: "",
  capabilities: [],
  isDefault: false,
};

export default function ProfilesPage() {
  const trpc = useTRPC();
  const profilesQuery = useQuery(trpc.access.listProfiles.queryOptions());
  const capsQuery = useQuery(trpc.access.allCapabilities.queryOptions());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);

  const allCaps = (capsQuery.data ?? []) as string[];
  const profiles = profilesQuery.data ?? [];

  const createMutation = useMutation(
    trpc.access.createProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile created");
        profilesQuery.refetch();
        closeDialog();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.access.updateProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile updated");
        profilesQuery.refetch();
        closeDialog();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  const deleteMutation = useMutation(
    trpc.access.deleteProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile deleted");
        profilesQuery.refetch();
      },
      onError: (err) => toast.error(err.message),
    }),
  );

  function closeDialog() {
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
  }

  function openEdit(profile: {
    id: string;
    name: string;
    description: string | null;
    capabilities: string[];
    isDefault: boolean;
  }) {
    setEditId(profile.id);
    setForm({
      name: profile.name,
      description: profile.description ?? "",
      capabilities: profile.capabilities,
      isDefault: profile.isDefault,
    });
    setDialogOpen(true);
  }

  function openCreate() {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function toggleCap(cap: string) {
    setForm((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter((c) => c !== cap)
        : [...prev.capabilities, cap],
    }));
  }

  function handleSubmit() {
    if (editId) {
      updateMutation.mutate({ id: editId, ...form });
    } else {
      createMutation.mutate(form);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Group capabilities by prefix for organized display
  const capGroups = allCaps.reduce<Record<string, string[]>>((acc, cap) => {
    const prefix = cap.split(":").slice(0, -1).join(":");
    const group = prefix || "other";
    if (!acc[group]) acc[group] = [];
    acc[group].push(cap);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/permissions">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Access Profiles</h1>
            <p className="text-sm text-muted-foreground">Create and manage capability bundles.</p>
          </div>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) closeDialog();
            else setDialogOpen(true);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-1 size-4" />
              New Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Profile" : "New Profile"}</DialogTitle>
              <DialogDescription>
                {editId
                  ? "Update the profile name, description, and capabilities."
                  : "Create a new access profile with specific capabilities."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Project Viewer"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={2}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isDefault"
                  checked={form.isDefault}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isDefault: checked === true }))
                  }
                />
                <Label htmlFor="isDefault" className="text-sm">
                  Default profile (auto-assigned to new users)
                </Label>
              </div>
              <div className="space-y-3">
                <Label>Capabilities</Label>
                {Object.entries(capGroups)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([group, caps]) => (
                    <div key={group} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {group}
                      </p>
                      <div className="space-y-1">
                        {caps.sort().map((cap) => (
                          <div key={cap} className="flex items-center gap-2">
                            <Checkbox
                              id={cap}
                              checked={form.capabilities.includes(cap)}
                              onCheckedChange={() => toggleCap(cap)}
                            />
                            <Label htmlFor={cap} className="text-sm font-normal">
                              {cap}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!form.name || isPending}>
                {isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
                {editId ? "Save" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Capabilities</TableHead>
            <TableHead>Default</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {profiles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No profiles found.
              </TableCell>
            </TableRow>
          ) : (
            profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>
                  <div>
                    <span className="font-medium">{profile.name}</span>
                    {profile.description && (
                      <p className="text-xs text-muted-foreground">{profile.description}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {profile.capabilities.length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      <>
                        {profile.capabilities.slice(0, 3).map((cap) => (
                          <Badge key={cap} variant="outline" className="text-xs">
                            {cap}
                          </Badge>
                        ))}
                        {profile.capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.capabilities.length - 3}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>{profile.isDefault && <Badge>Default</Badge>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(profile)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate({ id: profile.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

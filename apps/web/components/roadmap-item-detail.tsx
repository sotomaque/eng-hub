"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { ArrowLeft, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { SortableTableRow } from "@/components/data-table/sortable-table-row";
import { KeyResultsEditor } from "@/components/key-results-editor";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants/roadmap";
import { useBreadcrumbTitle } from "@/lib/contexts/breadcrumb-context";
import { useTRPC } from "@/lib/trpc/client";

interface AssignmentPerson {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    imageUrl: string | null;
  };
}

interface KeyResultItem {
  id: string;
  status: string;
}

interface KeyResultFull {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string | null;
  status: string;
  sortOrder: number;
}

interface ChildItem {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  sortOrder: number;
  assignments: AssignmentPerson[];
  keyResults: KeyResultItem[];
  quarter: string | null;
}

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: string;
  parentId: string | null;
  parent: { id: string; title: string } | null;
  quarter: string | null;
  assignments: AssignmentPerson[];
  keyResults: KeyResultFull[];
  children: ChildItem[];
}

interface RoadmapItemDetailProps {
  projectId: string;
  type: "milestone" | "quarterlyGoal";
  item: RoadmapItem;
}

export function RoadmapItemDetail({
  projectId,
  type,
  item,
}: RoadmapItemDetailProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const { setTitle } = useBreadcrumbTitle();

  useEffect(() => {
    setTitle(item.title);
    return () => setTitle(null);
  }, [item.title, setTitle]);

  const deleteSuccessHandler = () => {
    toast.success(
      `${type === "milestone" ? "Milestone" : "Quarterly goal"} deleted`,
    );
    const backUrl = item.parent
      ? `/projects/${projectId}/roadmap/${item.parent.id}`
      : `/projects/${projectId}/roadmap`;
    router.push(backUrl);
    router.refresh();
  };
  const deleteErrorHandler = (error: { message: string }) =>
    toast.error(error.message);

  const deleteMilestoneMutation = useMutation(
    trpc.milestone.delete.mutationOptions({
      onSuccess: deleteSuccessHandler,
      onError: deleteErrorHandler,
    }),
  );
  const deleteGoalMutation = useMutation(
    trpc.quarterlyGoal.delete.mutationOptions({
      onSuccess: deleteSuccessHandler,
      onError: deleteErrorHandler,
    }),
  );
  const deleteMutation =
    type === "milestone" ? deleteMilestoneMutation : deleteGoalMutation;

  const reorderMilestoneMutation = useMutation(
    trpc.milestone.reorder.mutationOptions({
      onSuccess: () => router.refresh(),
      onError: (error) => toast.error(error.message),
    }),
  );
  const reorderGoalMutation = useMutation(
    trpc.quarterlyGoal.reorder.mutationOptions({
      onSuccess: () => router.refresh(),
      onError: (error) => toast.error(error.message),
    }),
  );
  const reorderMutation =
    type === "milestone" ? reorderMilestoneMutation : reorderGoalMutation;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const basePath = `/projects/${projectId}/roadmap`;
  const backHref = item.parent ? `${basePath}/${item.parent.id}` : basePath;
  const backLabel = item.parent ? item.parent.title : "Roadmap";
  const typeLabel = type === "milestone" ? "Milestone" : "Quarterly Goal";
  const editParam = type === "milestone" ? "editMilestone" : "editGoal";
  const addParam = type === "milestone" ? "addMilestone" : "addGoal";

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = item.children.map((c) => c.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedIds = arrayMove(ids, oldIndex, newIndex);
    reorderMutation.mutate({
      projectId,
      parentId: item.id,
      ids: reorderedIds,
    });
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              className={
                STATUS_STYLES[item.status as keyof typeof STATUS_STYLES] ?? ""
              }
            >
              {STATUS_LABELS[item.status as keyof typeof STATUS_LABELS] ??
                item.status}
            </Badge>
            {item.quarter && (
              <span className="text-sm text-muted-foreground">
                {item.quarter}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{item.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {item.targetDate && (
              <span>
                Target: {new Date(item.targetDate).toLocaleDateString()}
              </span>
            )}
            {item.assignments.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span>Assignees:</span>
                <div className="flex -space-x-1.5">
                  {item.assignments.map((a) => (
                    <Avatar
                      key={a.person.id}
                      className="size-6 border-2 border-background"
                    >
                      <AvatarImage src={a.person.imageUrl ?? undefined} />
                      <AvatarFallback className="text-[10px]">
                        {a.person.firstName[0]}
                        {a.person.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`${basePath}/${item.id}?${editParam}=${item.id}`, {
                scroll: false,
              })
            }
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {typeLabel.toLowerCase()}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{item.title}&quot; and all
                  its sub-items.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate({ id: item.id })}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap text-muted-foreground">
            {item.description}
          </p>
        </div>
      )}

      {/* Key Results */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Key Results</h2>
        <KeyResultsEditor
          keyResults={item.keyResults}
          milestoneId={type === "milestone" ? item.id : undefined}
          quarterlyGoalId={type === "quarterlyGoal" ? item.id : undefined}
          onChanged={() => router.refresh()}
        />
      </div>

      {/* Sub-items */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Sub-items ({item.children.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`${basePath}/${item.id}?${addParam}=true`, {
                scroll: false,
              })
            }
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>

        {item.children.length > 0 ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={item.children.map((c) => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30px]">
                        <span className="sr-only">Drag</span>
                      </TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Assignees
                      </TableHead>
                      <TableHead className="hidden md:table-cell">
                        KRs
                      </TableHead>
                      <TableHead className="hidden sm:table-cell">
                        Target Date
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.children.map((child) => (
                      <SortableTableRow key={child.id} id={child.id}>
                        <TableCell>
                          <GripVertical className="size-4 cursor-grab text-muted-foreground" />
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`${basePath}/${child.id}`}
                            className="font-medium hover:underline"
                          >
                            {child.title}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {child.assignments.length > 0 && (
                            <div className="flex -space-x-1.5">
                              {child.assignments.slice(0, 3).map((a) => (
                                <Avatar
                                  key={a.person.id}
                                  className="size-6 border-2 border-background"
                                >
                                  <AvatarImage
                                    src={a.person.imageUrl ?? undefined}
                                  />
                                  <AvatarFallback className="text-[10px]">
                                    {a.person.firstName[0]}
                                    {a.person.lastName[0]}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {child.assignments.length > 3 && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  +{child.assignments.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {child.keyResults.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {
                                child.keyResults.filter(
                                  (kr) => kr.status === "COMPLETED",
                                ).length
                              }
                              /{child.keyResults.length}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-muted-foreground">
                            {child.targetDate
                              ? new Date(child.targetDate).toLocaleDateString()
                              : "\u2014"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              STATUS_STYLES[
                                child.status as keyof typeof STATUS_STYLES
                              ] ?? ""
                            }
                          >
                            {STATUS_LABELS[
                              child.status as keyof typeof STATUS_LABELS
                            ] ?? child.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() =>
                                router.push(
                                  `${basePath}/${item.id}?${editParam}=${child.id}`,
                                  { scroll: false },
                                )
                              }
                            >
                              <Pencil className="size-3.5" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </div>
                        </TableCell>
                      </SortableTableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <p className="text-sm text-muted-foreground">
            No sub-items yet. Click &quot;Add&quot; to create one.
          </p>
        )}
      </div>
    </div>
  );
}

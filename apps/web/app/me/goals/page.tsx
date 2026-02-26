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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { format } from "date-fns";
import { GripVertical, Pencil, Plus, Target, Trash2, Trophy } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import { PersonAccomplishmentSheet } from "@/components/person-accomplishment-sheet";
import { PersonGoalSheet } from "@/components/person-goal-sheet";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/constants/roadmap";
import { useTRPC } from "@/lib/trpc/client";

const POINTER_SENSOR_OPTIONS = { activationConstraint: { distance: 5 } } as const;

const GOALS_EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Target className="text-muted-foreground mb-2 size-8" />
    <p className="text-muted-foreground text-sm">No goals yet. Add your first goal.</p>
  </div>
);

const ACCOMPLISHMENTS_EMPTY_STATE = (
  <div className="flex flex-col items-center justify-center py-8 text-center">
    <Trophy className="text-muted-foreground mb-2 size-8" />
    <p className="text-muted-foreground text-sm">No accomplishments logged yet.</p>
  </div>
);

type PersonGoal = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  quarter: string | null;
  sortOrder: number;
};

type PersonAccomplishment = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
};

function SortableGoalRow({
  goal,
  onEdit,
  onDelete,
  isDeleting,
}: {
  goal: PersonGoal;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: goal.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
        <span className="sr-only">Drag to reorder</span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{goal.title}</p>
        {goal.description ? (
          <p className="mt-0.5 truncate text-muted-foreground text-xs">{goal.description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {goal.quarter ? (
          <Badge variant="secondary" className="text-xs">
            {goal.quarter}
          </Badge>
        ) : null}
        {goal.targetDate ? (
          <span className="hidden text-muted-foreground text-xs sm:inline">
            {new Date(goal.targetDate).toLocaleDateString()}
          </span>
        ) : null}
        <Badge className={STATUS_STYLES[goal.status as keyof typeof STATUS_STYLES] ?? ""}>
          {STATUS_LABELS[goal.status as keyof typeof STATUS_LABELS] ?? goal.status}
        </Badge>
        <Button variant="ghost" size="icon" className="size-7" onClick={onEdit}>
          <Pencil className="size-3.5" />
          <span className="sr-only">Edit</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="size-7" disabled={isDeleting}>
              <Trash2 className="size-3.5" />
              <span className="sr-only">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete goal?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &quot;{goal.title}&quot;.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={isDeleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const trpc = useTRPC();

  const goalsQuery = useQuery(trpc.personGoal.listMine.queryOptions());
  const accomplishmentsQuery = useQuery(trpc.personAccomplishment.listMine.queryOptions());

  const goals = (goalsQuery.data as PersonGoal[] | undefined) ?? [];
  const accomplishments = (accomplishmentsQuery.data as PersonAccomplishment[] | undefined) ?? [];
  const goalIds = useMemo(() => goals.map((g) => g.id), [goals]);

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_SENSOR_OPTIONS),
    useSensor(KeyboardSensor),
  );

  const deleteGoalMutation = useMutation(
    trpc.personGoal.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Goal deleted");
        router.refresh();
        goalsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const reorderGoalsMutation = useMutation(
    trpc.personGoal.reorder.mutationOptions({
      onError: (error) => toast.error(error.message),
    }),
  );

  const deleteAccomplishmentMutation = useMutation(
    trpc.personAccomplishment.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Accomplishment deleted");
        router.refresh();
        accomplishmentsQuery.refetch();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  function handleGoalDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = goals.findIndex((g) => g.id === active.id);
    const newIndex = goals.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedIds = arrayMove(
      goals.map((g) => g.id),
      oldIndex,
      newIndex,
    );
    reorderGoalsMutation.mutate({ ids: reorderedIds });
  }

  function openSheet(params: Record<string, string>) {
    const next = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(params)) next.set(k, v);
    router.push(`${window.location.pathname}?${next.toString()}`, { scroll: false });
  }

  // Determine which sheet to open
  const addGoal = searchParams.get("addGoal") === "true";
  const editGoalId = searchParams.get("editGoal");
  const addAccomplishment = searchParams.get("addAccomplishment") === "true";
  const editAccomplishmentId = searchParams.get("editAccomplishment");

  const editingGoal = editGoalId ? goals.find((g) => g.id === editGoalId) : undefined;
  const editingAccomplishment = editAccomplishmentId
    ? accomplishments.find((a) => a.id === editAccomplishmentId)
    : undefined;

  const deletingGoalId = deleteGoalMutation.isPending
    ? (deleteGoalMutation.variables?.id ?? null)
    : null;
  const deletingAccomplishmentId = deleteAccomplishmentMutation.isPending
    ? (deleteAccomplishmentMutation.variables?.id ?? null)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Goals & Accomplishments</h1>
      </div>

      {/* Goals section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="text-muted-foreground size-4" />
              <CardTitle>Goals</CardTitle>
              {goals.length > 0 && (
                <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {goals.length}
                </span>
              )}
            </div>
            <Button size="sm" onClick={() => openSheet({ addGoal: "true" })}>
              <Plus className="size-4" />
              Add Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {goals.length === 0 ? (
            GOALS_EMPTY_STATE
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleGoalDragEnd}
            >
              <SortableContext items={goalIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {goals.map((goal) => (
                    <SortableGoalRow
                      key={goal.id}
                      goal={goal}
                      onEdit={() => openSheet({ editGoal: goal.id })}
                      onDelete={() => deleteGoalMutation.mutate({ id: goal.id })}
                      isDeleting={deletingGoalId === goal.id}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Accomplishments section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="text-muted-foreground size-4" />
              <CardTitle>Accomplishments</CardTitle>
              {accomplishments.length > 0 && (
                <span className="text-muted-foreground rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {accomplishments.length}
                </span>
              )}
            </div>
            <Button size="sm" onClick={() => openSheet({ addAccomplishment: "true" })}>
              <Plus className="size-4" />
              Log Win
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {accomplishments.length === 0 ? (
            ACCOMPLISHMENTS_EMPTY_STATE
          ) : (
            <div className="space-y-2">
              {accomplishments.map((accomplishment) => (
                <div
                  key={accomplishment.id}
                  className="flex items-center gap-3 rounded-md border bg-card px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{accomplishment.title}</p>
                    {accomplishment.description ? (
                      <p className="mt-0.5 truncate text-muted-foreground text-xs">
                        {accomplishment.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {accomplishment.date ? (
                      <span className="hidden text-muted-foreground text-xs sm:inline">
                        {format(new Date(accomplishment.date), "MMM d, yyyy")}
                      </span>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => openSheet({ editAccomplishment: accomplishment.id })}
                    >
                      <Pencil className="size-3.5" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          disabled={deletingAccomplishmentId === accomplishment.id}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete accomplishment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete &quot;{accomplishment.title}&quot;.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              deleteAccomplishmentMutation.mutate({ id: accomplishment.id })
                            }
                            disabled={deletingAccomplishmentId === accomplishment.id}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            {deletingAccomplishmentId === accomplishment.id
                              ? "Deleting…"
                              : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sheets */}
      {(addGoal || editGoalId) && <PersonGoalSheet goal={editingGoal} />}
      {(addAccomplishment || editAccomplishmentId) && (
        <PersonAccomplishmentSheet accomplishment={editingAccomplishment} />
      )}
    </div>
  );
}

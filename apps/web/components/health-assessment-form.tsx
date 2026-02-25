"use client";

import type { HealthStatus } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/core";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { HealthStatusPicker } from "@/components/health-status-picker";
import { useTRPC } from "@/lib/trpc/client";

const TiptapEditor = dynamic(
  () =>
    import("@/components/tiptap-editor").then((m) => ({
      default: m.TiptapEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] w-full animate-pulse rounded-lg border border-input bg-background" />
    ),
  },
);

type DimensionKey =
  | "growth"
  | "margin"
  | "longevity"
  | "clientSatisfaction"
  | "engineeringVibe"
  | "productVibe"
  | "designVibe";

const BUSINESS_DIMENSIONS: {
  key: DimensionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "growth",
    label: "Growth",
    description: "Revenue trajectory and new business pipeline",
  },
  {
    key: "margin",
    label: "Margin",
    description: "Profitability and cost efficiency",
  },
  {
    key: "longevity",
    label: "Longevity",
    description: "Long-term sustainability and retention",
  },
  {
    key: "clientSatisfaction",
    label: "Client Satisfaction",
    description: "Customer happiness and relationship health",
  },
];

const VIBE_CHECKS: {
  key: DimensionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "engineeringVibe",
    label: "Engineering",
    description: "Team morale, velocity, and technical health",
  },
  {
    key: "productVibe",
    label: "Product",
    description: "Product direction, discovery, and delivery",
  },
  {
    key: "designVibe",
    label: "Design",
    description: "Design quality, capacity, and alignment",
  },
];

const BUSINESS_KEYS = BUSINESS_DIMENSIONS.map((d) => d.key);
const VIBE_KEYS = VIBE_CHECKS.map((d) => d.key);

type DimensionState = {
  status: HealthStatus | null;
  notes: JSONContent | undefined;
};

type ExistingAssessment = {
  id: string;
  overallStatus: HealthStatus;
  overallNotes: unknown;
  growthStatus: HealthStatus | null;
  growthNotes: unknown;
  marginStatus: HealthStatus | null;
  marginNotes: unknown;
  longevityStatus: HealthStatus | null;
  longevityNotes: unknown;
  clientSatisfactionStatus: HealthStatus | null;
  clientSatisfactionNotes: unknown;
  engineeringVibeStatus: HealthStatus | null;
  engineeringVibeNotes: unknown;
  productVibeStatus: HealthStatus | null;
  productVibeNotes: unknown;
  designVibeStatus: HealthStatus | null;
  designVibeNotes: unknown;
};

interface HealthAssessmentFormProps {
  projectId: string;
  assessment?: ExistingAssessment;
  prefill?: ExistingAssessment;
}

function getStatusKey(key: DimensionKey): `${DimensionKey}Status` {
  return `${key}Status`;
}

function getNotesKey(key: DimensionKey): `${DimensionKey}Notes` {
  return `${key}Notes`;
}

function dimensionSummary(
  dimensions: Record<DimensionKey, DimensionState>,
  keys: DimensionKey[],
): number {
  return keys.filter((k) => dimensions[k].status).length;
}

export function HealthAssessmentForm({
  projectId,
  assessment,
  prefill,
}: HealthAssessmentFormProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const isEdit = !!assessment;

  const [overallStatus, setOverallStatus] = useState<HealthStatus | null>(
    assessment?.overallStatus ?? prefill?.overallStatus ?? null,
  );
  const [overallNotes, setOverallNotes] = useState<JSONContent | undefined>(
    (assessment?.overallNotes as JSONContent) ?? undefined,
  );

  const [dimensions, setDimensions] = useState<Record<DimensionKey, DimensionState>>(() => {
    const initial: Record<DimensionKey, DimensionState> = {
      growth: { status: null, notes: undefined },
      margin: { status: null, notes: undefined },
      longevity: { status: null, notes: undefined },
      clientSatisfaction: { status: null, notes: undefined },
      engineeringVibe: { status: null, notes: undefined },
      productVibe: { status: null, notes: undefined },
      designVibe: { status: null, notes: undefined },
    };
    const source = assessment ?? prefill;
    if (source) {
      for (const key of Object.keys(initial) as DimensionKey[]) {
        initial[key] = {
          status: source[getStatusKey(key)] ?? null,
          // Only prefill notes for edit mode, not for new assessments
          notes: assessment ? ((source[getNotesKey(key)] as JSONContent) ?? undefined) : undefined,
        };
      }
    }
    return initial;
  });

  const hasPrefilled =
    !isEdit &&
    prefill &&
    [...BUSINESS_DIMENSIONS, ...VIBE_CHECKS].some((d) => prefill[getStatusKey(d.key)]);

  const [openSections, setOpenSections] = useState<string[]>(
    isEdit || hasPrefilled ? ["business", "vibes"] : [],
  );

  const createMutation = useMutation(
    trpc.healthAssessment.create.mutationOptions({
      onSuccess: () => {
        toast.success("Health assessment created");
        router.push(`/projects/${projectId}/health`);
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const updateMutation = useMutation(
    trpc.healthAssessment.update.mutationOptions({
      onSuccess: () => {
        toast.success("Health assessment updated");
        router.push(`/projects/${projectId}/health`);
        router.refresh();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  function updateDimension(
    key: DimensionKey,
    field: "status" | "notes",
    value: HealthStatus | JSONContent | undefined,
  ) {
    setDimensions((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!overallStatus) {
      toast.error("Overall status is required");
      return;
    }

    const dimensionData: Record<string, unknown> = {};
    for (const key of Object.keys(dimensions) as DimensionKey[]) {
      const dim = dimensions[key];
      if (dim.status) {
        dimensionData[getStatusKey(key)] = dim.status;
      }
      if (dim.notes) {
        dimensionData[getNotesKey(key)] = dim.notes;
      }
    }

    if (isEdit && assessment) {
      updateMutation.mutate({
        id: assessment.id,
        overallStatus,
        overallNotes: overallNotes ?? undefined,
        ...dimensionData,
      });
    } else {
      createMutation.mutate({
        projectId,
        overallStatus,
        overallNotes: overallNotes ?? undefined,
        ...dimensionData,
      });
    }
  }

  const businessCount = dimensionSummary(dimensions, BUSINESS_KEYS);
  const vibeCount = dimensionSummary(dimensions, VIBE_KEYS);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 min-h-[400px]">
      {/* Header — sticky */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center justify-between border-b border-border/50 bg-background/95 px-1 pb-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild className="size-8">
            <Link href={`/projects/${projectId}/health`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-semibold">
              {isEdit ? "Edit Assessment" : "New Health Assessment"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Rate the project across business dimensions and team vibes.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => router.push(`/projects/${projectId}/health`)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !overallStatus}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Create Assessment"}
          </Button>
        </div>
      </div>

      {/* Overall Status — prominent top section */}
      <div className="rounded-lg border border-border bg-muted/30 p-5">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              Overall Status
            </Label>
            <HealthStatusPicker
              value={overallStatus}
              onChange={setOverallStatus}
              disabled={isSubmitting}
            />
          </div>
          <NotesToggle
            notes={overallNotes}
            onChange={setOverallNotes}
            disabled={isSubmitting}
            defaultOpen={!!overallNotes}
          />
        </div>
      </div>

      {/* Business Dimensions */}
      <Accordion
        type="multiple"
        value={openSections}
        onValueChange={setOpenSections}
        className="flex flex-col gap-4 py-4 "
      >
        <AccordionItem value="business" className="rounded-lg border last:border-b">
          <AccordionTrigger className="px-5 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Business Dimensions</span>
              {businessCount > 0 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {businessCount} / {BUSINESS_DIMENSIONS.length}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-5">
              {BUSINESS_DIMENSIONS.map((dim, i) => (
                <div key={dim.key}>
                  {i > 0 && <Separator className="mb-5" />}
                  <DimensionSection
                    label={dim.label}
                    description={dim.description}
                    status={dimensions[dim.key].status}
                    notes={dimensions[dim.key].notes}
                    onStatusChange={(s) => updateDimension(dim.key, "status", s)}
                    onNotesChange={(n) => updateDimension(dim.key, "notes", n)}
                    disabled={isSubmitting}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vibes" className="rounded-lg border last:border-b">
          <AccordionTrigger className="px-5 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Vibe Checks</span>
              {vibeCount > 0 && (
                <Badge variant="secondary" className="text-xs font-normal">
                  {vibeCount} / {VIBE_CHECKS.length}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-5">
              {VIBE_CHECKS.map((dim, i) => (
                <div key={dim.key}>
                  {i > 0 && <Separator className="mb-5" />}
                  <DimensionSection
                    label={dim.label}
                    description={dim.description}
                    status={dimensions[dim.key].status}
                    notes={dimensions[dim.key].notes}
                    onStatusChange={(s) => updateDimension(dim.key, "status", s)}
                    onNotesChange={(n) => updateDimension(dim.key, "notes", n)}
                    disabled={isSubmitting}
                  />
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </form>
  );
}

interface NotesToggleProps {
  notes: JSONContent | undefined;
  onChange: (content: JSONContent) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
}

function NotesToggle({ notes, onChange, disabled, defaultOpen = false }: NotesToggleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        {open ? "Hide notes" : "Add notes"}
      </button>
      {open && (
        <div className="mt-2">
          <TiptapEditor
            initialContent={notes}
            onChange={onChange}
            editable={!disabled}
            className="min-h-[100px]"
          />
        </div>
      )}
    </div>
  );
}

interface DimensionSectionProps {
  label: string;
  description: string;
  status: HealthStatus | null;
  notes: JSONContent | undefined;
  onStatusChange: (status: HealthStatus) => void;
  onNotesChange: (content: JSONContent) => void;
  disabled?: boolean;
}

function DimensionSection({
  label,
  description,
  status,
  notes,
  onStatusChange,
  onNotesChange,
  disabled,
}: DimensionSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <HealthStatusPicker value={status} onChange={onStatusChange} disabled={disabled} />
      <NotesToggle
        notes={notes}
        onChange={onNotesChange}
        disabled={disabled}
        defaultOpen={!!notes}
      />
    </div>
  );
}

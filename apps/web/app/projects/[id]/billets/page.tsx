import type { Metadata } from "next";
import { Suspense } from "react";
import { BilletSection } from "@/components/billet-section";
import { BilletSheet } from "@/components/billet-sheet";
import { getCachedBilletsByProjectId } from "@/lib/trpc/cached-queries";

export const metadata: Metadata = { title: "Billets" };
export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ create?: string; edit?: string }>;
};

async function BilletContent({ projectId }: { projectId: string }) {
  const billets = await getCachedBilletsByProjectId(projectId);
  return <BilletSection billets={billets} />;
}

async function EditBilletContent({ projectId, billetId }: { projectId: string; billetId: string }) {
  const billets = await getCachedBilletsByProjectId(projectId);
  const billet = billets.find((b) => b.id === billetId);
  if (!billet) return null;
  return <BilletSheet billet={billet} />;
}

export default async function BilletsPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <>
      <Suspense fallback={null}>
        <BilletContent projectId={id} />
      </Suspense>

      {sp.create === "true" && <BilletSheet projectId={id} />}
      {sp.edit && (
        <Suspense fallback={null}>
          <EditBilletContent projectId={id} billetId={sp.edit} />
        </Suspense>
      )}
    </>
  );
}

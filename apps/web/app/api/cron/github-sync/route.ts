import { syncAllGitHubStats, syncGitHubStatsForProject } from "@workspace/api";
import { z } from "zod";

const singleProjectSchema = z.object({ projectId: z.string() });

async function handler(request: Request): Promise<Response> {
  const body = await request.json().catch(() => null);
  const parsed = singleProjectSchema.safeParse(body);

  // If a specific projectId is provided, sync only that project
  if (parsed.success) {
    try {
      await syncGitHubStatsForProject(parsed.data.projectId);
      return new Response(JSON.stringify({ synced: [parsed.data.projectId] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Otherwise, sync all projects with a GitHub URL
  const results = await syncAllGitHubStats();
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// QStash signature verification — only enabled when signing keys are configured.
// Preview environments don't have QStash credentials, so the handler runs unwrapped.
const hasQStash = process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY;

export async function POST(request: Request): Promise<Response> {
  if (hasQStash) {
    const { verifySignatureAppRouter } = await import("@upstash/qstash/nextjs");
    return verifySignatureAppRouter(handler)(request);
  }
  return handler(request);
}

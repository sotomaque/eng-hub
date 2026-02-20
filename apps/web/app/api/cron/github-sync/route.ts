import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { syncAllGitHubStats, syncGitHubStatsForProject } from "@workspace/api";

async function handler(request: Request) {
  const body = await request.json().catch(() => null);

  // If a specific projectId is provided, sync only that project
  if (body && typeof body === "object" && "projectId" in body) {
    const { projectId } = body as { projectId: string };
    await syncGitHubStatsForProject(projectId);
    return new Response(JSON.stringify({ synced: [projectId] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Otherwise, sync all projects with a GitHub URL
  const results = await syncAllGitHubStats();
  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST = verifySignatureAppRouter(handler);

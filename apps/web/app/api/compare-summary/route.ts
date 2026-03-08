import { createAnthropic } from "@ai-sdk/anthropic";
import { auth } from "@clerk/nextjs/server";
import { streamText } from "ai";
import { z } from "zod/v4";
import { env } from "@/env";

const MAX_CUSTOM_PROMPT_LENGTH = 500;

const bodySchema = z
  .object({
    customPrompt: z.string().max(MAX_CUSTOM_PROMPT_LENGTH).optional(),
  })
  .passthrough();

const SYSTEM_PROMPT = `You are an engineering analytics expert analyzing contributor comparison data from a git repository. You will receive structured JSON data containing metrics for multiple contributors over a time period.

Produce a concise, data-driven narrative analysis with these sections:

## Overview
Identify the top performer by MRs merged and the most consistent contributor. Call out any standout patterns (e.g. someone producing at 2-4x the rate, someone with notably negative net lines indicating cleanup work). Use specific numbers.

## Individual Profiles
For each contributor, write 2-3 sentences covering:
- Their output level relative to others (use percentages: "54% of the top contributor's MR output")
- Trajectory: trending up, down, or stable based on monthly data. Call out dark months (0 commits/MRs).
- Work style: interpret commit types (fix-heavy = maintenance focus, feat-heavy = building, chore-heavy = incremental work, negative net lines = refactoring/cleanup)

## Monthly Trajectory
Analyze the monthly commit and MR patterns across all contributors. Who's accelerating? Who's slowing down? Who had completely inactive months? Note any correlations (e.g. "when X was inactive in Nov-Dec, Y picked up the pace").

## Work Style Comparison
Compare commit type distributions across contributors. Who's primarily building features vs fixing bugs vs doing maintenance? Note when large negative net lines paired with high commit count signals valuable cleanup/refactoring work, not low output.

## Key Takeaways
One clear, specific bottom-line sentence per contributor. Be direct — e.g. "Chris B is the lowest output by every metric — 10 MRs in 6 months, at roughly 1/5 of the top contributor's pace."

Rules:
- Use SPECIFIC numbers from the data. Never use vague words like "significant", "substantial", "notable" without a number.
- Express relative comparisons as percentages of the top contributor or a reference person.
- Negative net lines is NOT bad — it often indicates refactoring, cleanup, and tech debt reduction.
- Months with 0 commits should be called "dark months" or "completely inactive".
- Keep tone professional and analytical. No promotional language or euphemisms.
- Format with markdown headers (##) and bullet points.
- Keep the total analysis under 600 words.`;

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Not available in production" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { customPrompt, ...compareData } = parsed.data;

  const system = customPrompt
    ? `${SYSTEM_PROMPT}\n\n## Additional Instructions\n${customPrompt}`
    : SYSTEM_PROMPT;

  const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    maxOutputTokens: 2000,
    system,
    prompt: JSON.stringify(compareData, null, 2),
  });

  return result.toTextStreamResponse();
}

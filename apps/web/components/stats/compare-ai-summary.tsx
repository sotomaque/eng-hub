"use client";

import { useCompletion } from "@ai-sdk/react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2, MessageSquarePlus, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const SUMMARY_LOADING_STEPS = [
  "Preparing contributor data…",
  "Sending to AI model…",
  "Analyzing patterns…",
  "Writing narrative…",
  "Finalizing summary…",
];

type CompareAISummaryProps = {
  data: Record<string, unknown>;
  onCompletionChange?: (text: string) => void;
};

export function CompareAISummary({ data, onCompletionChange }: CompareAISummaryProps) {
  const [customPromptOpen, setCustomPromptOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [summaryStep, setSummaryStep] = useState(0);
  const summaryInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    completion,
    complete,
    isLoading: isSummaryLoading,
  } = useCompletion({ api: "/api/compare-summary", streamProtocol: "text" });

  const stopSummarySteps = useCallback(() => {
    if (summaryInterval.current) {
      clearInterval(summaryInterval.current);
      summaryInterval.current = null;
    }
  }, []);

  const startSummarySteps = useCallback(() => {
    setSummaryStep(0);
    stopSummarySteps();
    summaryInterval.current = setInterval(() => {
      setSummaryStep((prev) => (prev < SUMMARY_LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);
  }, [stopSummarySteps]);

  useEffect(() => {
    if (!isSummaryLoading) stopSummarySteps();
  }, [isSummaryLoading, stopSummarySteps]);

  useEffect(() => {
    if (completion) onCompletionChange?.(completion);
  }, [completion, onCompletionChange]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>AI Summary</CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isSummaryLoading}
              onClick={() => setCustomPromptOpen(true)}
            >
              <MessageSquarePlus className="mr-2 size-4" />
              Custom Prompt
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isSummaryLoading}
              onClick={() => {
                startSummarySteps();
                complete("", { body: data });
              }}
            >
              {isSummaryLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              {isSummaryLoading ? "Generating…" : "Generate Summary"}
            </Button>
          </div>
        </CardHeader>
        {(completion || isSummaryLoading) && (
          <CardContent>
            {isSummaryLoading && !completion && (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
                <span className="text-muted-foreground text-sm">
                  {SUMMARY_LOADING_STEPS[summaryStep]}
                </span>
              </div>
            )}
            {completion && (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {completion}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      <Dialog open={customPromptOpen} onOpenChange={setCustomPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Custom Prompt</DialogTitle>
            <DialogDescription>
              Add custom instructions for the AI analysis. This will be appended to the default
              system prompt.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder='e.g. "Focus on who improved the most over the last 3 months" or "Compare code review activity"'
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomPromptOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!customPrompt.trim()}
              onClick={() => {
                setCustomPromptOpen(false);
                startSummarySteps();
                complete("", {
                  body: { ...data, customPrompt: customPrompt.trim() },
                });
              }}
            >
              <Sparkles className="mr-2 size-4" />
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

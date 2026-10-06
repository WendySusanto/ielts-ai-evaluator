import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

// Gemini reports no progress of its own, so the bar is an estimate: it rises quickly, then slows,
// and holds below 100 until the server says scoring is done — about 63% at 45s, 87% at 90s.
const EXPECTED_SECONDS = 45;
const estimate = (seconds: number) => 95 * (1 - Math.exp(-seconds / EXPECTED_SECONDS));

// Worded loosely on purpose: elapsed time is all the page knows about where scoring has got to.
const stage = (seconds: number) =>
  seconds < 6
    ? "Sending your answers…"
    : seconds < 60
      ? "Scoring your answers…"
      : seconds < 120
        ? "Writing your feedback…"
        : "Taking longer than usual — still working…";

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;

/** Shown in place of the practice controls while a session is scored. The page polls the server;
 * this only shows time passing — or the failure, with a way to try again. */
export function EvaluationProgress({
  startedAt,
  error,
  onRetry,
}: {
  startedAt: number;
  error: string | null;
  onRetry: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (error) return;
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tick);
  }, [error]);

  const seconds = Math.max(0, (now - startedAt) / 1000);

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border border-destructive/40 p-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button className="h-11" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between text-sm">
        <span aria-live="polite" className="font-medium">
          {stage(seconds)}
        </span>
        <span className="tabular-nums text-muted-foreground">{clock(seconds)}</span>
      </div>
      <Progress value={estimate(seconds)} aria-label="Scoring progress (estimated)" />
      <p className="text-xs text-muted-foreground">
        This usually takes about a minute. You can leave this page — your feedback will
        appear in History when it's ready.
      </p>
    </div>
  );
}

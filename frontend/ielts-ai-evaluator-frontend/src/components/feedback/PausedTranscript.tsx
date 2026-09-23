import {
  LONG_PAUSE_SECONDS,
  parseLexicalTranscript,
} from "@/lib/lexical";

// A pause is drawn, not printed, so it has to be wide enough to notice and narrow enough not to
// push the words around. Clamped, because a 12-second silence should read as "very long", not
// as a bar that breaks the bubble.
const MIN_BAR_PX = 10;
const MAX_BAR_PX = 72;
const PX_PER_SECOND = 14;

/** One candidate answer as it was actually recognized: no punctuation, no tidied-up false
 * starts, and every silence over a second drawn as a bar. Red once a pause passes
 * LONG_PAUSE_SECONDS, green below it. The colour never carries the meaning on its own — each
 * bar states its length in a label, for screen readers and on hover. */
export function PausedTranscript({ lexical }: { lexical: string }) {
  return (
    <p className="text-sm leading-7 text-muted-foreground">
      {parseLexicalTranscript(lexical).map((segment, i) =>
        segment.kind === "text" ? (
          <span key={i}>{segment.text} </span>
        ) : (
          <span
            key={i}
            role="img"
            aria-label={
              segment.seconds >= LONG_PAUSE_SECONDS
                ? `long pause, ${segment.seconds} seconds`
                : `pause, ${segment.seconds} seconds`
            }
            title={`${segment.seconds}s pause`}
            className={`mx-1 inline-block h-2 rounded-full align-middle ${
              segment.seconds >= LONG_PAUSE_SECONDS
                ? "bg-destructive"
                : "bg-chart-4"
            }`}
            style={{
              width: `${Math.min(
                MAX_BAR_PX,
                MIN_BAR_PX + segment.seconds * PX_PER_SECOND,
              )}px`,
            }}
          />
        ),
      )}
    </p>
  );
}

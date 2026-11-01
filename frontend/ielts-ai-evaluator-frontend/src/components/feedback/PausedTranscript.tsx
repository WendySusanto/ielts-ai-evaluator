import {
  LONG_PAUSE_SECONDS,
  parseLexicalTranscript,
} from "@/lib/lexical";

// Pause bar width: wide enough to notice, narrow enough not to shove the words; clamped so a
// 12s silence doesn't break the bubble.
const MIN_BAR_PX = 10;
const MAX_BAR_PX = 72;
const PX_PER_SECOND = 14;

/** One answer as recognized (no punctuation or tidying), each pause over 1s drawn as a bar: red
 * past LONG_PAUSE_SECONDS, green below, and labelled for screen readers. */
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

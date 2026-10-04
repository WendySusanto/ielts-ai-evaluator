import { useEffect, useState } from "react";

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

/** Recording used so far against the session limit. Ticks on its own while `running`, so the
 * practice page does not re-render every second. When a turn ends the live part is kept until the
 * page adds that turn's recording to `recordedSeconds`, so the clock never jumps backwards. */
export function RecordingClock({
  recordedSeconds,
  running,
  limitSeconds,
}: {
  recordedSeconds: number;
  running: boolean;
  limitSeconds: number;
}) {
  const [liveSeconds, setLiveSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    setLiveSeconds(0);
    const tick = setInterval(() => setLiveSeconds((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(tick);
  }, [running]);

  // The finished turn is now part of recordedSeconds; drop the live count that stood in for it.
  useEffect(() => setLiveSeconds(0), [recordedSeconds]);

  const used = Math.min(recordedSeconds + liveSeconds, limitSeconds);
  return (
    <span
      className="text-xs tabular-nums text-muted-foreground"
      aria-label={`Recorded ${clock(used)} of ${clock(limitSeconds)}`}
    >
      {clock(used)} / {clock(limitSeconds)}
    </span>
  );
}

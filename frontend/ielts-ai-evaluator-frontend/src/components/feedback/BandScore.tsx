import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  hero: "text-5xl",
  md: "text-2xl",
  sm: "text-base font-semibold",
} as const;

function bandColor(band: number): string {
  if (band >= 7) return "text-primary";
  if (band >= 5.5) return "text-tip";
  return "text-destructive";
}

export function BandScore({
  band,
  size = "md",
}: {
  band: number;
  size?: "hero" | "md" | "sm";
}) {
  return (
    <span
      className={cn("font-bold tabular-nums", SIZE_CLASSES[size], bandColor(band))}
    >
      {band.toFixed(1)}
    </span>
  );
}

import { useEffect, useRef } from "react";

// Tallest in the middle, so a single loudness reading draws a voice shape, not a flat block.
const BAR_WEIGHTS = [0.55, 0.8, 1, 0.8, 0.55];
// A silent mic still shows a row of short bars, so "listening" never looks like "off".
const MIN_SCALE = 0.15;
// Rise at once, fall over ~0.1s so the gaps between syllables don't flicker.
// ponytail: tuned by feel — lengthen if the bars still look jittery.
const RELEASE_MS = 100;

/** Live mic level as five bars, drawn straight to the DOM each frame so the page doesn't re-render.
 * Decorative; under reduced motion only the opacity follows the voice. */
export function VoiceLevelBars({ getLevel }: { getLevel: () => number }) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let shown = 0;
    let last = performance.now();
    let frame = requestAnimationFrame(function draw(now) {
      const level = getLevel();
      shown =
        level >= shown
          ? level
          : shown + (level - shown) * (1 - Math.exp(-(now - last) / RELEASE_MS));
      last = now;
      barsRef.current.forEach((bar, i) => {
        if (!bar) return;
        bar.style.transform = `scaleY(${MIN_SCALE + (1 - MIN_SCALE) * shown * BAR_WEIGHTS[i]})`;
        bar.style.opacity = String(0.4 + 0.6 * shown);
      });
      frame = requestAnimationFrame(draw);
    });
    return () => cancelAnimationFrame(frame);
  }, [getLevel]);

  return (
    <div aria-hidden className="flex h-8 items-center gap-1">
      {BAR_WEIGHTS.map((_, i) => (
        <span
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="h-full w-1.5 rounded-full bg-primary motion-reduce:transform-none!"
          style={{ transform: `scaleY(${MIN_SCALE})`, opacity: 0.4 }}
        />
      ))}
    </div>
  );
}

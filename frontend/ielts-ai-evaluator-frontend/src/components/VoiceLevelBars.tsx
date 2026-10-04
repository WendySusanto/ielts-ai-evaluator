import { useEffect, useRef } from "react";

// Tallest in the middle, so a single loudness reading draws a voice shape, not a flat block.
const BAR_WEIGHTS = [0.55, 0.8, 1, 0.8, 0.55];
// A silent mic still shows a row of short bars, so "listening" never looks like "off".
const MIN_SCALE = 0.15;
// Bars rise at once, so each syllable lands, and fall back over about a tenth of a second, so
// the gaps between syllables don't flicker.
// ponytail: tuned by feel, not measured — lengthen if the bars still look jittery.
const RELEASE_MS = 100;

/** The live mic level as five bars. Drawn straight onto the DOM each animation frame, so a 60fps
 * meter never re-renders the page around it. Decorative: the listening state is already given in
 * text. Under reduced motion the bars stand still and only their opacity follows the voice. */
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

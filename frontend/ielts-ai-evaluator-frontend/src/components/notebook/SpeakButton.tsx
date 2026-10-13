import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canSpeak, speak } from "@/lib/notebook";

/** Reads text aloud. Renders nothing where the browser has no speech synthesis. Pass `label`
 * for long text, so a screen reader doesn't announce the whole paragraph as the button name. */
export function SpeakButton({ text, label }: { text: string; label?: string }) {
  if (!canSpeak) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={() => speak(text)}
      aria-label={label ?? `Pronounce “${text}”`}
      title={label ?? "Pronounce"}
    >
      <Volume2 />
    </Button>
  );
}

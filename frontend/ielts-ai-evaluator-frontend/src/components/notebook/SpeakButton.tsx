import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { canSpeak, speak } from "@/lib/notebook";

/** Reads a word aloud. Renders nothing where the browser has no speech synthesis. */
export function SpeakButton({ text }: { text: string }) {
  if (!canSpeak) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={() => speak(text)}
      aria-label={`Pronounce “${text}”`}
      title="Pronounce"
    >
      <Volume2 />
    </Button>
  );
}

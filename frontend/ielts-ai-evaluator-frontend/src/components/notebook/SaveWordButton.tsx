import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Notebook } from "@/hooks/use-notebook";
import { cn } from "@/lib/utils";
import type { NotebookCreateRequest } from "@/types/notebook";

/** Bookmark toggle for one feedback word: filled once the word is in the notebook, and a second
 * click takes it back out. */
export function SaveWordButton({
  entry,
  notebook,
  className,
}: {
  entry: NotebookCreateRequest;
  notebook: Notebook;
  className?: string;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const saved = notebook.find(entry.word);

  const toggle = async () => {
    setBusy(true);
    try {
      if (saved) {
        await notebook.remove(saved);
      } else if (await notebook.save(entry)) {
        toast.success(`Saved “${entry.word}” to your notebook`, {
          action: { label: "Open", onClick: () => navigate("/notebook") },
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const label = saved
    ? `Remove “${entry.word}” from notebook`
    : `Save “${entry.word}” to notebook`;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("size-8 shrink-0", saved && "text-primary", className)}
      onClick={toggle}
      disabled={busy}
      aria-pressed={!!saved}
      aria-label={label}
      title={label}
    >
      {saved ? <BookmarkCheck className="fill-primary/20" /> : <Bookmark />}
    </Button>
  );
}

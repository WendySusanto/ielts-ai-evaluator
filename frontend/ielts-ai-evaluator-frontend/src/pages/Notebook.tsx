import { GraduationCap, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EntryDialog, type EntryFormValues } from "@/components/notebook/EntryDialog";
import { ReviewDialog } from "@/components/notebook/ReviewDialog";
import { SpeakButton } from "@/components/notebook/SpeakButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNotebook } from "@/hooks/use-notebook";
import { getRelativeTime } from "@/lib/utils";
import type { NotebookEntry, NotebookSource } from "@/types/notebook";
import ErrorPage from "./ErrorPage";

type SourceFilter = "all" | NotebookSource;
type StatusTab = "learning" | "mastered";

const SOURCE_PATH: Record<NotebookSource, string | null> = {
  Writing: "/feedback/",
  Speaking: "/speaking-feedback/",
  Manual: null,
};

// ponytail: filters in memory — one learner's notebook is hundreds of words at most. Move the
// search server-side if a notebook ever needs paging.
const matches = (e: NotebookEntry, query: string) =>
  [e.word, e.meaning, e.example, e.replaces].some((f) => f?.toLowerCase().includes(query));

const Notebook = () => {
  const navigate = useNavigate();
  const notebook = useNotebook();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [tab, setTab] = useState<StatusTab>("learning");
  // undefined = closed, null = adding, entry = editing
  const [editing, setEditing] = useState<NotebookEntry | null | undefined>(undefined);
  const [reviewing, setReviewing] = useState(false);

  if (notebook.isLoading && notebook.entries.length === 0) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (notebook.error) {
    return (
      <ErrorPage
        title="Error loading your notebook"
        message={notebook.error.message || "Failed to load data"}
        onRetry={notebook.refetch}
      />
    );
  }

  const { entries } = notebook;
  const learning = entries.filter((e) => !e.mastered);
  const q = query.trim().toLowerCase();
  const visible = entries.filter(
    (e) =>
      e.mastered === (tab === "mastered") &&
      (source === "all" || e.source === source) &&
      (!q || matches(e, q)),
  );

  const submit = async ({ word, meaning, example, level }: EntryFormValues) => {
    if (editing) {
      return !!(await notebook.update(editing.notebookEntryId, {
        word,
        meaning,
        example,
        mastered: editing.mastered,
      }));
    }
    return !!(await notebook.save({ word, meaning, example, level, source: "Manual" }));
  };

  const setMastered = (e: NotebookEntry, mastered: boolean) =>
    notebook.update(e.notebookEntryId, {
      word: e.word,
      meaning: e.meaning,
      example: e.example,
      mastered,
    });

  return (
    <div className="space-y-6 min-h-full">
      {/* Header — the layout header owns the h1 ("Notebook"). */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground">
          Words you're learning, from your feedback or added by hand
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(null)}>
            <Plus />
            Add word
          </Button>
          <Button onClick={() => setReviewing(true)} disabled={learning.length === 0}>
            <GraduationCap />
            Review{learning.length > 0 && ` (${learning.length})`}
          </Button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="max-w-sm text-muted-foreground">
            Your notebook is empty. Add a word yourself, or tap the bookmark next to any
            vocabulary suggestion in your feedback.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setEditing(null)}>Add word</Button>
            <Button variant="outline" onClick={() => navigate("/feedback")}>
              Open feedback history
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-48 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search words, meanings, examples"
                aria-label="Search notebook"
                className="pl-9"
              />
            </div>
            <Select value={source} onValueChange={(v) => setSource(v as SourceFilter)}>
              <SelectTrigger className="w-36" aria-label="Filter by source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="Writing">Writing</SelectItem>
                <SelectItem value="Speaking">Speaking</SelectItem>
                <SelectItem value="Manual">Added by me</SelectItem>
              </SelectContent>
            </Select>
            <Tabs value={tab} onValueChange={(v) => setTab(v as StatusTab)}>
              <TabsList>
                <TabsTrigger value="learning">Learning ({learning.length})</TabsTrigger>
                <TabsTrigger value="mastered">
                  Mastered ({entries.length - learning.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {visible.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {q || source !== "all"
                ? "No words match your search."
                : tab === "mastered"
                  ? "No mastered words yet — mark one in review or tick it below."
                  : "Everything here is mastered. Nice work!"}
            </p>
          ) : (
            <ul className="space-y-3">
              {visible.map((e) => {
                const sourcePath = SOURCE_PATH[e.source];
                return (
                  <li
                    key={e.notebookEntryId}
                    className="flex gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-foreground">{e.word}</span>
                        {e.level && (
                          <Badge variant="secondary" title="Approximate CEFR level">
                            {e.level}
                          </Badge>
                        )}
                        {e.replaces && (
                          <span className="text-xs text-muted-foreground">
                            instead of “{e.replaces}”
                          </span>
                        )}
                        <SpeakButton text={e.word} />
                      </div>
                      {e.meaning && <p className="text-foreground">{e.meaning}</p>}
                      {e.example && (
                        <p className="border-l-2 border-border pl-3 italic text-muted-foreground">
                          {e.example}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {sourcePath && e.sourceId ? (
                          <Link
                            to={`${sourcePath}${e.sourceId}`}
                            className="underline-offset-4 hover:underline"
                          >
                            From {e.source.toLowerCase()} feedback
                          </Link>
                        ) : (
                          "Added by you"
                        )}
                        {" · "}
                        {getRelativeTime(e.createdAt)}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <Checkbox
                          checked={e.mastered}
                          onChange={(ev) => setMastered(e, ev.target.checked)}
                        />
                        Mastered
                      </label>
                      <div className="flex">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => setEditing(e)}
                          aria-label={`Edit “${e.word}”`}
                          title="Edit"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 hover:text-destructive"
                          onClick={() => notebook.remove(e)}
                          aria-label={`Delete “${e.word}”`}
                          title="Delete"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      {editing !== undefined && (
        <EntryDialog
          entry={editing ?? undefined}
          onSubmit={submit}
          onClose={() => setEditing(undefined)}
        />
      )}
      {reviewing && (
        <ReviewDialog entries={learning} notebook={notebook} onClose={() => setReviewing(false)} />
      )}
    </div>
  );
};

export default Notebook;

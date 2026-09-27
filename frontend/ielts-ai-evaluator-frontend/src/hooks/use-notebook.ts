import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/use-api";
import { api, ApiError } from "@/lib/api";
import { friendlyError } from "@/lib/friendly-error";
import type {
  NotebookCreateRequest,
  NotebookEntry,
  NotebookUpdateRequest,
} from "@/types/notebook";

const URL = "/api/v2/notebook";

// A 400 carries the server's own sentence ("… is already in your notebook"), which is
// friendlier than any generic fallback.
function showError(error: unknown) {
  const err = error instanceof ApiError ? error : new ApiError(0, "");
  toast.error(err.status === 400 ? err.message : friendlyError(err));
}

const toCreateRequest = (e: NotebookEntry): NotebookCreateRequest => ({
  word: e.word,
  meaning: e.meaning,
  example: e.example,
  replaces: e.replaces,
  level: e.level,
  source: e.source,
  sourceId: e.sourceId,
});

/** The user's notebook plus the mutations that keep it in sync. Call once per page and pass the
 * result down; every mutation patches the loaded list rather than refetching it.
 * Mutations report their own errors as toasts and resolve to null on failure. */
export function useNotebook() {
  const { data, isLoading, error, refetch, setData } = useApi<NotebookEntry[]>(URL);

  const byWord = useMemo(
    () => new Map((data ?? []).map((e) => [e.word.toLowerCase(), e])),
    [data],
  );
  const find = useCallback((word: string) => byWord.get(word.trim().toLowerCase()), [byWord]);

  const save = useCallback(
    async (request: NotebookCreateRequest) => {
      try {
        const entry = await api.post<NotebookEntry>(URL, request);
        setData((prev) =>
          prev?.some((e) => e.notebookEntryId === entry.notebookEntryId)
            ? prev
            : [entry, ...(prev ?? [])],
        );
        return entry;
      } catch (e) {
        showError(e);
        return null;
      }
    },
    [setData],
  );

  const update = useCallback(
    async (id: string, request: NotebookUpdateRequest) => {
      try {
        const entry = await api.put<NotebookEntry>(`${URL}/${id}`, request);
        setData((prev) => prev?.map((e) => (e.notebookEntryId === id ? entry : e)) ?? null);
        return entry;
      } catch (e) {
        showError(e);
        return null;
      }
    },
    [setData],
  );

  /** Deletes straight away and offers Undo, instead of asking first: a mis-click costs a tap. */
  const remove = useCallback(
    async (entry: NotebookEntry) => {
      try {
        await api.delete(`${URL}/${entry.notebookEntryId}`);
      } catch (e) {
        showError(e);
        return;
      }
      setData((prev) => prev?.filter((e) => e.notebookEntryId !== entry.notebookEntryId) ?? null);
      toast(`Removed “${entry.word}”`, {
        action: {
          label: "Undo",
          onClick: async () => {
            const restored = await save(toCreateRequest(entry));
            if (restored && entry.mastered) {
              await update(restored.notebookEntryId, {
                word: restored.word,
                meaning: restored.meaning,
                example: restored.example,
                mastered: true,
              });
            }
          },
        },
      });
    },
    [save, update, setData],
  );

  return { entries: data ?? [], isLoading, error, refetch, find, save, update, remove };
}

export type Notebook = ReturnType<typeof useNotebook>;

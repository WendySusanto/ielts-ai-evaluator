export type NotebookSource = "Manual" | "Writing" | "Speaking";

// GET /api/v2/notebook item
export interface NotebookEntry {
  notebookEntryId: string;
  word: string;
  meaning: string | null;
  example: string | null;
  /** The weaker word this one upgrades; null for manual entries. */
  replaces: string | null;
  /** Approximate CEFR level; speaking feedback only. */
  level: string | null;
  source: NotebookSource;
  /** The session it was saved from; null for manual entries. */
  sourceId: string | null;
  mastered: boolean;
  createdAt: string;
}

// Body for POST /api/v2/notebook. Saving a word already in the notebook returns that entry.
export interface NotebookCreateRequest {
  word: string;
  meaning?: string | null;
  example?: string | null;
  replaces?: string | null;
  level?: string | null;
  source: NotebookSource;
  sourceId?: string | null;
}

// Body for PUT /api/v2/notebook/{id}
export interface NotebookUpdateRequest {
  word: string;
  meaning: string | null;
  example: string | null;
  mastered: boolean;
}

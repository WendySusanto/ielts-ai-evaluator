// Types for the feedback history page. Matches backend WritingHistoryItemDto (WritingService.cs).
export interface WritingHistoryItem {
  writingEvaluationId: string;
  taskType: string;
  topic: string;
  overallBand: number;
  wordCount: number;
  createdAt: string;
}

export type EvaluationType = "Writing" | "Speaking" | "all";

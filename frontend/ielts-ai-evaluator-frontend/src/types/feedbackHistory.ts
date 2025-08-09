// Types for the feedback history API response
import type { FeedbackData } from "./evaluation";

export interface EvaluationHistoryItem {
  essayEvaluationId: string;
  taskType: string;
  topic: string;
  overallBand: number;
  createdAt: string;
  feedback: FeedbackData;
  evaluationType: string;
}

export type EvaluationType = "Writing" | "Speaking" | "all";

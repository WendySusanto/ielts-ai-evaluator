// Types for the IELTS Speaking module

export type SpeakingPart = "Part1" | "Part2" | "Part3";

export interface SpeakingPrompt {
  speakingPromptId: string;
  topic: string;
  description: string;
  preview: string;
  part: SpeakingPart;
  questionText: string;
  cuepoints?: string;
  duration: number;
  level: "Academic" | "General";
}

export interface SpeakingEvaluateRequest {
  transcript: string;
  speakingPromptId: string;
  question: string;
  part: string;
  cuepoints?: string;
}

export interface SpeakingEvaluateResponse {
  speakingEvaluationId: string;
  overallBand: number;
  rawJson: string;
  aiModel: string;
  promptTokenCount: number;
  candidatesTokenCount: number;
}

// Feedback shape mirrors the writing evaluation feedback so we can reuse
// the same rendering patterns. Speaking has its own four criteria.
export interface SpeakingSubScore {
  score: number;
  comment: string;
}

export interface SpeakingIssue {
  text: string;
  comment: string;
}

export interface SpeakingCriterion {
  band: number;
  generalFeedback: string;
  subScores: Record<string, SpeakingSubScore>;
  issues: SpeakingIssue[];
}

export interface SpeakingFeedback {
  overallBand: number;
  criteria: {
    fluencyCoherence: SpeakingCriterion;
    lexicalResource: SpeakingCriterion;
    grammaticalRangeAccuracy: SpeakingCriterion;
    pronunciation: SpeakingCriterion;
  };
}

export interface SpeakingHistoryItem {
  speakingEvaluationId: string;
  part: string;
  topic: string;
  overallBand: number;
  createdAt: string;
  feedback: SpeakingFeedback | null;
  evaluationType: "Speaking";
}

export interface SpeakingDetail {
  part: string;
  topic: string;
  transcript: string;
  feedback: SpeakingFeedback;
}

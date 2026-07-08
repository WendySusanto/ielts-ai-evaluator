// Types for the IELTS Speaking module, matching backend SpeakingPromptService.cs and
// DTOs/SpeakingFeedback.cs / Services/SpeakingService.cs.

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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Body for POST /api/speaking-prompts (admin upsert)
export interface SpeakingPromptUpsertRequest {
  speakingPromptId?: string;
  topic: string;
  description: string;
  preview: string;
  part: SpeakingPart;
  questionText: string;
  cuepoints?: string;
  duration: number;
  level: "Academic" | "General";
  isActive: boolean;
}

/** One turn of the conversation. */
export interface SpeakingTurn {
  role: "examiner" | "candidate";
  text: string;
}

/** One of the three Gemini-scored IELTS speaking criteria (pronunciation is separate). */
export interface SpeakingCriterion {
  name: string;
  band: number;
  justification: string;
  examples: string[];
  improvements: string[];
}

export interface SpeakingFeedback {
  overallBand: number;
  summary: string;
  criteria: SpeakingCriterion[];
}

// Body for POST /api/v2/speaking/sessions
export interface SpeakingEvaluateRequest {
  speakingPromptId: string;
  part: string;
  turns: SpeakingTurn[];
}

// Response from POST /api/v2/speaking/sessions
export interface SpeakingSessionDto {
  speakingSessionId: string;
  overallBand: number;
  feedback: SpeakingFeedback;
}

// GET /api/v2/speaking/sessions item
export interface SpeakingSessionHistoryItem {
  speakingSessionId: string;
  part: string;
  topic: string;
  overallBand: number;
  createdAt: string;
}

// GET /api/v2/speaking/sessions/{id}
export interface SpeakingSessionDetail {
  speakingSessionId: string;
  part: string;
  topic: string;
  questionText: string;
  turns: SpeakingTurn[];
  overallBand: number;
  feedback: SpeakingFeedback;
  pronunciation: string | null;
  createdAt: string;
}

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

// GET /api/speech/token — Azure Speech STS token used to drive TTS/STT client-side.
export interface SpeechToken {
  token: string;
  region: string;
  voice: string;
}

/** One word from Azure Pronunciation Assessment's per-word breakdown. */
export interface PronunciationWord {
  word: string;
  accuracyScore: number;
  errorType: string;
}

/** Azure Pronunciation Assessment result, aggregated client-side across candidate turns and
 * submitted with the final evaluation. Band is always server-recomputed from pronunciationScore
 * — the client never sends a meaningful value. */
export interface PronunciationResult {
  band?: number;
  pronunciationScore: number;
  accuracyScore: number;
  fluencyScore: number;
  prosodyScore: number;
  completenessScore: number;
  words: PronunciationWord[];
}

// Body for POST /api/speaking/examiner-turn
export interface ExaminerTurnRequest {
  speakingPromptId: string;
  part: string;
  turns: SpeakingTurn[];
}

// Response from POST /api/speaking/examiner-turn
export interface ExaminerTurnResult {
  nextQuestion: string;
  partComplete: boolean;
}

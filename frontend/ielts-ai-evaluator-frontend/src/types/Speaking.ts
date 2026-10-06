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
  /** Candidate turns only, and only when spoken: Azure's raw lexical recognition with
   * [pause N.Ns] markers. `text` is display text — punctuated and tidied — so it alone
   * hides both the hesitations and the grammar the candidate actually produced. */
  lexical?: string;
  /** Spoken candidate turns only: first word to last, pauses included. The server derives the
   * speech rate from this and `lexical`; the client never sends a rate of its own. */
  durationSeconds?: number;
}

/** One of the candidate's own sentences, and how a stronger speaker would say it. */
export interface SpeakingRewrite {
  original: string;
  improved: string;
  explanation: string;
}

/** A C1/C2 word or phrase, shown inside a sentence the candidate actually said. */
export interface SpeakingVocabularyUpgrade {
  phrase: string;
  level: string;
  replaces: string;
  original: string;
  improved: string;
}

/** Why a criterion is not yet at the next whole band, and one step that closes the gap. */
export interface SpeakingNextBand {
  band: number;
  missing: string;
  howTo: string;
}

/** Feedback on one candidate answer. `answer` counts candidate turns 1..n in conversation order. */
export interface SpeakingAnswerFeedback {
  answer: number;
  comment: string;
  sampleAnswer: string;
  /** From the answer's recording; null without one, absent before schema v3. */
  transcript?: string | null;
}

/** One grammar or word-choice mistake, quoted verbatim and corrected. */
export interface SpeakingError {
  original: string;
  corrected: string;
  category: string;
  explanation: string;
}

/** A word the candidate clearly mispronounced in a recording: as meant, as it sounded, one tip. */
export interface SpeakingPronunciationNote {
  word: string;
  heardAs: string;
  tip: string;
}

/** One answer's recording, sent with the final evaluation. `data` is base64. */
export interface SpeakingAudioClip {
  answer: number;
  mimeType: string;
  seconds: number;
  data: string;
}

/** A playable recording on the feedback page; the link expires after 30 minutes. */
export interface SpeakingAudioLink {
  answer: number;
  url: string;
}

/** One of the three Gemini-scored IELTS speaking criteria (pronunciation is separate). */
export interface SpeakingCriterion {
  name: string;
  band: number;
  justification: string;
  examples: string[];
  improvements: string[];
  /** Absent on sessions marked before rewrites existed. */
  rewrites?: SpeakingRewrite[] | null;
  /** Absent on sessions marked before it existed; null for a band of 9. */
  nextBand?: SpeakingNextBand | null;
}

export interface SpeakingFeedback {
  overallBand: number;
  summary: string;
  criteria: SpeakingCriterion[];
  /** Absent on sessions marked before it existed. */
  vocabulary?: SpeakingVocabularyUpgrade[] | null;
  /** Absent on sessions marked before schema v2. */
  answers?: SpeakingAnswerFeedback[] | null;
  /** Absent on sessions marked before schema v2. */
  errors?: SpeakingError[] | null;
  /** Absent on sessions marked before schema v3. */
  pronunciationNotes?: SpeakingPronunciationNote[] | null;
}

// Body for POST /api/v2/speaking/sessions
export interface SpeakingEvaluateRequest {
  speakingPromptId: string;
  part: string;
  turns: SpeakingTurn[];
  // Aggregated client-side via aggregateAssessments(); omitted entirely when no
  // candidate turn produced a pronunciation assessment (e.g. typed-mode fallback).
  pronunciation?: PronunciationResult;
  /** Generated when the session starts and kept in the draft: a retried submission reuses it, so the
   * server hands back the saved result instead of scoring twice. */
  clientSessionId?: string;
  /** Recorded answers, by answer number. Omitted when nothing was recorded. */
  audio?: SpeakingAudioClip[];
}

// GET /api/v2/speaking/evaluations/{id} — polled while an evaluation runs. `error` is set only when
// failed, and is written to be shown as is.
export interface SpeakingEvaluationStatus {
  status: "processing" | "completed" | "failed";
  startedAt: string;
  error?: string | null;
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
  speakingPromptId: string;
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
  pronunciation: PronunciationResult | null;
  createdAt: string;
  /** Null when nothing was recorded or storage is not configured. */
  audio?: SpeakingAudioLink[] | null;
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
  /** Server-computed from the turns, like band. Null when there was too little speech, or on
   * sessions recorded before it existed. */
  wordsPerMinute?: number | null;
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

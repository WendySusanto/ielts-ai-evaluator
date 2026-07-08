// Types matching backend DTOs/WritingFeedback.cs and Services/WritingService.cs

/** One of the four official IELTS writing criteria for a single essay. */
export interface WritingCriterion {
  name: string;
  band: number;
  justification: string;
  examples: string[];
  improvements: string[];
}

/** A specific grammar/vocabulary/spelling mistake, quoted verbatim from the essay. */
export interface WritingError {
  quote: string;
  correction: string;
  rule: string;
}

/** A word/phrase from the essay paired with a stronger alternative. */
export interface VocabularyUpgrade {
  original: string;
  upgrade: string;
  context: string;
}

export interface WritingFeedback {
  overallBand: number;
  summary: string;
  criteria: WritingCriterion[];
  errors: WritingError[];
  vocabularyUpgrades: VocabularyUpgrade[];
  improvedExcerpt: string;
}

// Response from POST /api/v2/writing/evaluations
export interface WritingEvaluationDto {
  writingEvaluationId: string;
  overallBand: number;
  feedback: WritingFeedback;
}

// Response from GET /api/v2/writing/evaluations/{id}
export interface WritingEvaluationDetail {
  writingEvaluationId: string;
  taskType: string;
  topic: string;
  questionText: string;
  essayText: string;
  wordCount: number;
  overallBand: number;
  feedback: WritingFeedback;
  createdAt: string;
}

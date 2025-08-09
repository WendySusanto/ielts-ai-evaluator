// Types for the evaluation API response
export interface Issue {
  text: string;
  comment: string;
}

export interface SubScore {
  score: number;
  comment: string;
}

export interface CriteriaData {
  band: number;
  generalFeedback: string;
  subScores: {
    [key: string]: SubScore;
  };
  issues: Issue[];
}

export interface FeedbackData {
  overallBand: number;
  criteria: {
    taskResponse: CriteriaData;
    coherenceCohesion: CriteriaData;
    lexicalResource: CriteriaData;
    grammaticalRangeAccuracy: CriteriaData;
  };
}

export interface EvaluationDetail {
  taskType: string;
  topic: string;
  userAnswer: string;
  feedback: FeedbackData;
}

export type CriteriaKeys = keyof FeedbackData["criteria"];

export interface CriteriaLabels {
  taskResponse: string;
  coherenceCohesion: string;
  lexicalResource: string;
  grammaticalRangeAccuracy: string;
}

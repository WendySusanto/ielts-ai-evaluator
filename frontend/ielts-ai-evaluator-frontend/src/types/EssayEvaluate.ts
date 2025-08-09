export interface EssayEvaluate {
  writingPromptId: string;
  userId: string;
  userAnswer: string;
  question: string;
  taskType: string; // e.g., "task1" or "task2"
  imageDescription: string; //used for backend to know what image is about
}

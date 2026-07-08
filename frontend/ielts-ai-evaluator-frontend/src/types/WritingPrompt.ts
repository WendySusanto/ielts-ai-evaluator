// Types matching backend WritingPromptDto / WritingPromptUpsertRequest (WritingPromptService.cs)
export default interface WritingPrompt {
  writingPromptId: string;
  topic: string;
  description: string;
  preview: string;
  questionType: string;
  questionText: string;
  duration: number;
  minimumWords: number;
  taskType: "Task1" | "Task2";
  level: "Academic" | "General";
  imageUrl?: string;
  imageDescription?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Body for POST /api/writing-prompts (admin upsert)
export interface WritingPromptUpsertRequest {
  writingPromptId?: string;
  topic: string;
  description: string;
  preview: string;
  questionType: string;
  questionText: string;
  duration: number;
  minimumWords: number;
  taskType: "Task1" | "Task2";
  level: "Academic" | "General";
  imageUrl?: string;
  imageDescription?: string;
  isActive: boolean;
}

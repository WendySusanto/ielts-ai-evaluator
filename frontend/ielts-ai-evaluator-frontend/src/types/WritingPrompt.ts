// Types based on the database models
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
  imageDescription?: string; // Optional field for image description
}

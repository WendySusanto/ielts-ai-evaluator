import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PenTool,
  Clock,
  Target,
  BarChart3,
  Brain,
  FileText,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import ApiResponse from "@/types/ApiResponse";
import WritingPrompt from "@/types/WritingPrompt";
import { useFetch } from "@/hooks/use-fetch";
import { useNavigate, useParams } from "react-router";
import { WritingPracticeSkeleton } from "@/components/skeleton/WritingPracticeSkeleton";
import NotFound from "./NotFound";
import { formatText } from "@/lib/utils";
import { EssayEvaluate } from "@/types/EssayEvaluate";
import { toast } from "sonner";
import { set } from "react-hook-form";
import { useAuth } from "@/contexts/AuthContext";

const WritingPractice = () => {
  const { taskType, taskId } = useParams<{
    taskType: string;
    taskId: string;
  }>();

  const { user } = useAuth();

  const {
    data: writingPrompt = null,
    isLoading: isLoadingPrompts,
    error: promptsError,
    refetch: refetchPrompts,
    mutate: mutatePrompts,
  } = useFetch<WritingPrompt>(`/api/writing-prompt?id=${taskId}`);

  const initialTimeValue = writingPrompt?.duration
    ? writingPrompt.duration
    : taskType === "task1"
    ? 1200
    : 2400;

  const taskTypeDesc = taskType == "Task1" ? "Task 1" : "Task 2";

  // Add these constants at the top of your file after imports
  const TASK1_PLACEHOLDER = `Begin writing your Task 1 response here. Remember to:
- Introduce what the chart/graph shows
- Provide an overview of the main trends
- Describe specific data and patterns
- Compare significant changes or differences
- Use appropriate data description vocabulary
- Include at least {minWords} words`;

  const TASK2_PLACEHOLDER = `Begin writing your Task 2 response here. Remember to:
- Introduce the topic and your position
- Present your main arguments clearly
- Support with relevant examples
- Consider different viewpoints
- Write a clear conclusion
- Include at least {minWords} words`;

  // Then update your Textarea component to use these constants

  const [essay, setEssay] = useState("");
  const [timeLeft, setTimeLeft] = useState(initialTimeValue); // 20 or 40 minutes
  const [wordCount, setWordCount] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data, isLoading, mutate } = useFetch<EssayEvaluate>(
    "/api/writing/evaluate",
    {
      skipInitialFetch: true,
    }
  );

  const navigate = useNavigate();

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEssay(text);
    setWordCount(
      text
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length
    );
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);

    const payload: EssayEvaluate = {
      writingPromptId: writingPrompt?.writingPromptId ?? taskId ?? "", // Use nullish coalescing,
      userId: user?.userId ?? "",
      userAnswer: essay,
      taskType: taskTypeDesc,
      question: writingPrompt?.questionText || "",
      imageDescription: writingPrompt?.imageDescription || "",
    };

    await mutate({
      url: "/api/writing/evaluate",
      method: "POST",
      data: payload,
      onSuccess: (data) => {
        setIsAnalyzing(false);
        setIsSubmitted(true);
        toast.success("Essay analyzed successfully!");
        navigate("/feedback");
      },
      onError: (error) => {
        toast.error(`Error analyzing essay: ${error.message}`);
        setIsAnalyzing(false);
      },
    });
  };

  const minWords = writingPrompt?.minimumWords || 150;
  const wordProgress = Math.min((wordCount / minWords) * 100, 100);

  if (isLoadingPrompts) {
    return <WritingPracticeSkeleton />;
  }

  if (!isLoadingPrompts && !writingPrompt) {
    return <NotFound />;
  }

  const Task1Tips = () => (
    <>
      <div className="p-3 bg-blue-100/50 dark:bg-card-blue-light rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Structure:</strong> Introduction → Overview → Body paragraphs
          with details
        </p>
      </div>
      <div className="p-3 bg-orange-100/50 dark:bg-card-orange-light rounded-lg">
        <p className="text-sm text-orange-700 dark:text-orange-300">
          <strong>Language:</strong> Use varied vocabulary for trends (increase,
          rise, peak, decline)
        </p>
      </div>
      <div className="p-3 bg-purple-100/50 dark:bg-card-purple-light rounded-lg">
        <p className="text-sm text-purple-700 dark:text-purple-300">
          <strong>Time:</strong> Spend about 20 minutes on Task 1
        </p>
      </div>
      <div className="p-3 bg-red-100/50 dark:bg-card-red-light rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-300">
          <strong>Focus:</strong> Describe data objectively, don't give opinions
        </p>
      </div>
    </>
  );

  const Task2Tips = () => (
    <>
      <div className="p-3 bg-blue-100/50 dark:bg-card-blue-light rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          <strong>Structure:</strong> Introduction → Clear position → Supporting
          paragraphs → Conclusion
        </p>
      </div>
      <div className="p-3 bg-orange-100/50 dark:bg-card-orange-light rounded-lg">
        <p className="text-sm text-orange-700 dark:text-orange-300">
          <strong>Language:</strong> Use academic vocabulary, linking words, and
          complex sentences
        </p>
      </div>
      <div className="p-3 bg-purple-100/50 dark:bg-card-purple-light rounded-lg">
        <p className="text-sm text-purple-700 dark:text-purple-300">
          <strong>Time:</strong> Spend about 40 minutes on Task 2
        </p>
      </div>
      <div className="p-3 bg-red-100/50 dark:bg-card-red-light rounded-lg">
        <p className="text-sm text-red-700 dark:text-red-300">
          <strong>Focus:</strong> Present clear arguments with specific examples
        </p>
      </div>
      <div className="p-3 bg-green-100/50 dark:bg-green-900 rounded-lg">
        <p className="text-sm text-green-700 dark:text-green-300">
          <strong>Balance:</strong> Consider multiple viewpoints before stating
          your position
        </p>
      </div>
    </>
  );

  const Task1Phrases = () => (
    <>
      <div className="text-sm text-card-foreground">
        <p className="font-medium mb-1">Introducing:</p>
        <p className="">"The chart illustrates..."</p>
        <p className="">"The data shows..."</p>
      </div>
      <div className="text-sm">
        <p className="font-medium text-card-foreground mb-1">Comparing:</p>
        <p className="">"In contrast to..."</p>
        <p className="">"While X increased, Y decreased..."</p>
      </div>
      <div className="text-sm">
        <p className="font-medium text-card-foreground mb-1">Trends:</p>
        <p className="">"Rose steadily..."</p>
        <p className="">"Fluctuated between..."</p>
      </div>
    </>
  );

  const Task2Phrases = () => (
    <>
      <div className="text-sm text-card-foreground">
        <p className="font-medium mb-1">Introducing the Topic:</p>
        <p className="">
          "In recent years, there has been growing concern about..."
        </p>
        <p className="">
          "One of the most significant issues facing society is..."
        </p>
      </div>
      <div className="text-sm">
        <p className="font-medium text-card-foreground mb-1">
          Expressing Opinion:
        </p>
        <p className="">"In my view, the most compelling reason is..."</p>
        <p className="">"While some argue that..., I believe that..."</p>
      </div>
      <div className="text-sm">
        <p className="font-medium text-card-foreground mb-1">
          Supporting Arguments:
        </p>
        <p className="">"A clear example of this can be seen in..."</p>
        <p className="">"This is evidenced by the fact that..."</p>
      </div>
      <div className="text-sm">
        <p className="font-medium text-card-foreground mb-1">Concluding:</p>
        <p className="">
          "In conclusion, while there are various perspectives..."
        </p>
        <p className="">"Taking all these points into consideration..."</p>
      </div>
    </>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Button
        onClick={() => navigate(-1)}
        variant="outline"
        className="border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Writing {taskTypeDesc}</h1>
        <p className="text-muted-foreground-bold">
          Academic Writing - Describe visual information in at least {minWords}{" "}
          words
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Writing Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Description */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Task Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-card-blue-light rounded-lg border-l-4 border-card-blue-light-border">
                <p className="text-blue-900 dark:text-blue-100 mb-4 whitespace-pre-wrap">
                  <strong>{formatText(writingPrompt?.questionText)}</strong>
                </p>
              </div>

              {/* Sample Chart Placeholder */}
              {writingPrompt?.imageUrl ? (
                <div className="mt-4 p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg border-2 border-dashed border-gray-300">
                  <img src={writingPrompt.imageUrl} alt="Task Chart" />
                </div>
              ) : (
                ""
              )}
            </CardContent>
          </Card>

          {/* Writing Area */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-primary" />
                  Your Response
                </CardTitle>
                <CardDescription className="text-muted-foreground-bold">
                  Write your response here. Aim for at least {minWords} words.
                </CardDescription>
              </div>
              <Badge variant={"secondary"} className="text-lg">
                <span>{formatTime(timeLeft)}</span>
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Word Count Progress
                  </span>
                  <Badge
                    variant={wordCount >= minWords ? "default" : "secondary"}
                  >
                    {wordCount}/{minWords} words
                  </Badge>
                </div>
                <Progress value={wordProgress} className="h-2" />
                <p className="text-xs text-muted-foreground-bold">
                  {wordCount < minWords
                    ? `${
                        minWords - wordCount
                      } more words needed to meet minimum requirement`
                    : "Great! You've met the minimum word requirement"}
                </p>
              </div>
              <Textarea
                placeholder={
                  taskType === "Task1"
                    ? TASK1_PLACEHOLDER.replace(
                        "{minWords}",
                        minWords.toString()
                      )
                    : TASK2_PLACEHOLDER.replace(
                        "{minWords}",
                        minWords.toString()
                      )
                }
                value={essay}
                onChange={handleTextChange}
                className="min-h-[400px] resize-none"
              />

              <div className="flex justify-between items-center">
                {/* <Button variant="outline">Save Draft</Button> */}
                <Button
                  onClick={handleAnalyze}
                  disabled={wordCount < minWords || isAnalyzing}
                  className={`min-w-[120px] bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white`}
                >
                  {isAnalyzing ? "Analyzing..." : "Get AI Feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Writing Tips */}
          <Card>
            <CardHeader>
              <CardTitle>{taskTypeDesc} Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {taskType === "Task1" ? <Task1Tips /> : <Task2Tips />}
            </CardContent>
          </Card>

          {/* Sample Phrases */}
          <Card>
            <CardHeader>
              <CardTitle>Useful Phrases</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {taskType === "Task1" ? <Task1Phrases /> : <Task2Phrases />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WritingPractice;

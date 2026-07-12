import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  FileText,
  Clock,
  Save,
  Lightbulb,
  Send,
  Pause,
  Play,
  RotateCcw,
  Loader2,
} from "lucide-react";
import WritingPrompt from "@/types/WritingPrompt";
import { useApi } from "@/hooks/use-api";
import { useNavigate, useParams } from "react-router";
import { WritingPracticeSkeleton } from "@/components/skeleton/WritingPracticeSkeleton";
import NotFound from "./NotFound";
import { formatText } from "@/lib/utils";
import type { WritingEvaluationDto } from "@/types/evaluation";
import { toast } from "sonner";

const STRUCTURE: Record<"Task1" | "Task2", { title: string; description: string }[]> = {
  Task2: [
    { title: "Introduction", description: "Paraphrase the question and state your position." },
    { title: "Body 1", description: "Present your first idea with a supporting example." },
    { title: "Body 2", description: "Present a second idea, or address a counterpoint." },
    { title: "Conclusion", description: "Restate your position and summarize your reasoning." },
  ],
  Task1: [
    { title: "Introduction", description: "Paraphrase what the chart or diagram shows." },
    { title: "Overview", description: "Give 2 key trends or features, with no specific data." },
    { title: "Body 1", description: "Describe the first group of data in detail." },
    { title: "Body 2", description: "Describe the second group, including comparisons." },
  ],
};

const COACH_TIPS: Record<"Task1" | "Task2", string[]> = {
  Task2: [
    "Support every main point with a specific example or reason - examiners reward developed ideas, not just claims.",
    "Keep paragraphing consistent: one central idea per body paragraph makes your argument easier to follow.",
  ],
  Task1: [
    "Never give opinions in Task 1 - describe only what the data shows, using an objective tone throughout.",
    "Group similar data together and use comparative language (e.g. 'whereas', 'in contrast') instead of listing numbers.",
  ],
};

const wordsOf = (text: string) => text.trim().split(/\s+/).filter(Boolean);
const sentencesOf = (text: string) =>
  text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);

const formatTime = (seconds: number) => {
  const mins = Math.floor(Math.max(seconds, 0) / 60);
  const secs = Math.max(seconds, 0) % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const WritingPractice = () => {
  const { taskType, taskId } = useParams<{
    taskType: string;
    taskId: string;
  }>();

  const { data: writingPrompt = null, isLoading: isLoadingPrompts } =
    useApi<WritingPrompt>(`/api/writing-prompts/${taskId}`);

  const { mutate } = useApi<WritingEvaluationDto>("/api/v2/writing/evaluations", {
    skipInitialFetch: true,
  });

  const navigate = useNavigate();

  const [essay, setEssay] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const draftKey = writingPrompt ? `draft:writing:${writingPrompt.writingPromptId}` : null;

  // Initialize the countdown once the prompt (and its duration) has loaded.
  // duration is stored in minutes; the countdown ticks in seconds.
  useEffect(() => {
    if (writingPrompt && timeLeft === null) {
      setTimeLeft(writingPrompt.duration * 60);
    }
  }, [writingPrompt, timeLeft]);

  // Restore any saved draft once we know which prompt we're on. Runs once per
  // draftKey so it never clobbers text the user has already started typing.
  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      setEssay(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || isPaused || isSubmitting) return;
    const timer = setTimeout(() => setTimeLeft((t) => (t ?? 0) - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, isPaused, isSubmitting]);

  const words = useMemo(() => wordsOf(essay), [essay]);
  const sentences = useMemo(() => sentencesOf(essay), [essay]);
  const minimumWords = writingPrompt?.minimumWords ?? 150;
  const belowMinimum = words.length < minimumWords;

  const resolvedTaskType: "Task1" | "Task2" = writingPrompt?.taskType ?? (taskType === "Task1" ? "Task1" : "Task2");

  const handleSaveDraft = () => {
    if (!draftKey) return;
    localStorage.setItem(draftKey, essay);
    toast.success("Draft saved");
  };

  const handleSubmit = async () => {
    if (belowMinimum || isSubmitting || !writingPrompt) return;
    setIsSubmitting(true);

    await mutate({
      url: "/api/v2/writing/evaluations",
      method: "POST",
      data: {
        writingPromptId: writingPrompt.writingPromptId,
        essayText: essay,
      },
      onSuccess: (result) => {
        setIsSubmitting(false);
        if (draftKey) localStorage.removeItem(draftKey);
        toast.success("Essay analyzed successfully!");
        navigate(`/feedback/${result.writingEvaluationId}`);
      },
      onError: (error) => {
        setIsSubmitting(false);
        toast.error(`Error analyzing essay: ${error.message}`);
      },
    });
  };

  if (isLoadingPrompts) {
    return <WritingPracticeSkeleton />;
  }

  if (!writingPrompt) {
    return <NotFound />;
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Top bar */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="-ml-3 h-11"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            {resolvedTaskType === "Task1" ? "Task 1" : "Task 2"} &middot; {writingPrompt.questionType}
          </p>
          <h1 className="text-3xl font-bold">{writingPrompt.topic}</h1>
        </div>

        <Card className="flex-row items-center gap-3 px-4 py-2 w-fit">
          <Clock className="h-5 w-5 text-primary shrink-0" />
          <span className="text-lg font-semibold tabular-nums min-w-[3.5rem]">
            {formatTime(timeLeft ?? writingPrompt.duration)}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label={isPaused ? "Resume timer" : "Pause timer"}
            onClick={() => setIsPaused((p) => !p)}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            aria-label="Reset timer"
            onClick={() => {
              setTimeLeft(writingPrompt.duration * 60);
              setIsPaused(false);
            }}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      {/* Workspace */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main column */}
        <div className="space-y-6 order-1">
          <Card className="bg-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-secondary-foreground">
                <FileText className="h-5 w-5" />
                Your prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-secondary-foreground whitespace-pre-wrap">
                {formatText(writingPrompt.questionText)}
              </p>
              {writingPrompt.imageDescription && (
                <p className="text-sm text-secondary-foreground/80">
                  {writingPrompt.imageDescription}
                </p>
              )}
              {writingPrompt.imageUrl && (
                <img
                  src={writingPrompt.imageUrl}
                  alt="Task visual"
                  className="w-full rounded-md object-cover"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4">
              <CardTitle>Your response</CardTitle>
              <span className="text-sm tabular-nums text-muted-foreground">
                <span className={belowMinimum ? "text-tip font-medium" : undefined}>
                  {words.length} / {minimumWords} words
                </span>
                {" "}&middot; {sentences.length} sentences
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder="Start writing your response here..."
                className="min-h-[400px] resize-none border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button variant="outline" onClick={handleSaveDraft} className="h-11">
                  <Save className="h-4 w-4 mr-2" />
                  Save draft
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={belowMinimum || isSubmitting}
                  className="h-11 min-w-[200px]"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isSubmitting ? "Submitting..." : "Submit for AI feedback"}
                </Button>
              </div>

              {belowMinimum && (
                <p className="text-xs text-tip">
                  {minimumWords - words.length} more words to meet the minimum
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Guidance rail */}
        <div className="space-y-6 order-2">
          <Card>
            <CardHeader>
              <CardTitle>Suggested structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {STRUCTURE[resolvedTaskType].map((step, index) => (
                <div key={step.title} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-tip text-tip-foreground">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-tip-foreground">
                <Lightbulb className="h-5 w-5" />
                Coach's tip
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {COACH_TIPS[resolvedTaskType].map((tip) => (
                <p key={tip} className="text-sm">
                  {tip}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Not the right topic?</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="h-11 w-full"
                onClick={() => navigate("/writing")}
              >
                Change topic
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WritingPractice;

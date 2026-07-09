import { WritingPracticeSkeleton } from "@/components/skeleton/WritingPracticeSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { formatText } from "@/lib/utils";
import type {
  SpeakingEvaluateRequest,
  SpeakingSessionDto,
  SpeakingPrompt,
} from "@/types/Speaking";
import {
  AlertTriangle,
  ArrowLeft,
  Lightbulb,
  MessageCircle,
  Mic,
  MicOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import NotFound from "./NotFound";

const MIN_WORDS = 40;

const SpeakingPractice = () => {
  const { taskId } = useParams<{ part: string; taskId: string }>();
  const navigate = useNavigate();

  const { data: prompt = null, isLoading } = useApi<SpeakingPrompt>(
    `/api/speaking-prompts/${taskId}`,
  );

  const speech = useSpeechRecognition("en-US");
  const { mutate } = useApi<SpeakingSessionDto>(
    "/api/v2/speaking/sessions",
    { skipInitialFetch: true },
  );

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showShortDialog, setShowShortDialog] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  // Timer ticks only while recording.
  useEffect(() => {
    if (!speech.isListening) return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [speech.isListening]);

  const transcript = speech.transcript;
  const wordCount = transcript.trim()
    ? transcript.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnalyze = async () => {
    if (speech.isListening) speech.stop();
    if (wordCount < MIN_WORDS) {
      setShowShortDialog(true);
      return;
    }
    await submit();
  };

  const submit = async () => {
    if (!prompt) return;
    setIsAnalyzing(true);

    const payload: SpeakingEvaluateRequest = {
      speakingPromptId: prompt.speakingPromptId,
      part: prompt.part,
      turns: [{ role: "candidate", text: transcript }],
    };

    await mutate({
      url: "/api/v2/speaking/sessions",
      method: "POST",
      data: payload,
      onSuccess: (result) => {
        setIsAnalyzing(false);
        setIsSubmitted(true);
        toast.success("Speaking response analyzed successfully!");
        navigate(`/speaking-feedback/${result.speakingSessionId}`);
      },
      onError: (error) => {
        toast.error(`Error analyzing response: ${error.message}`);
        setIsAnalyzing(false);
      },
    });
  };

  if (isLoading) {
    return <WritingPracticeSkeleton />;
  }

  if (!isLoading && !prompt) {
    return <NotFound />;
  }

  const partLabel =
    prompt!.part === "Part1"
      ? "Part 1"
      : prompt!.part === "Part2"
        ? "Part 2"
        : "Part 3";

  const tips =
    prompt!.part === "Part1"
      ? [
          "Give answers of 2-3 sentences — not too short, not a speech.",
          "Add a reason or example to every answer.",
          "Use a range of tenses naturally (I usually..., I've recently...).",
          "Sound relaxed and conversational.",
        ]
      : prompt!.part === "Part2"
        ? [
            "Use your 1 minute to jot down ideas for each bullet point.",
            "Structure: introduction → cover all bullets → personal reflection.",
            "Aim to speak for the full 1-2 minutes without long pauses.",
            "Use descriptive vocabulary and link your ideas.",
          ]
        : [
            "Give extended, opinion-based answers with justification.",
            "Discuss both sides before giving your view.",
            "Use linking phrases (on the other hand, that said...).",
            "Speculate about the future or compare past and present.",
          ];

  const cuePoints = prompt!.cuepoints
    ? prompt!.cuepoints.split("\n").filter((c) => c.trim().length > 0)
    : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <Button
        onClick={() => navigate(-1)}
        variant="outline"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Speaking {partLabel}</h1>
        <p className="text-foreground font-medium">{prompt!.topic}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question / cue card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                {prompt!.part === "Part2" ? "Cue Card" : "Question"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-secondary rounded-lg border-l-4 border-border">
                <p className="text-secondary-foreground whitespace-pre-wrap font-medium">
                  {formatText(prompt!.questionText)}
                </p>
                {cuePoints.length > 0 && (
                  <ul className="mt-3 space-y-1 list-disc list-inside text-secondary-foreground text-sm">
                    {cuePoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recorder */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  Your Response
                </CardTitle>
                <CardDescription className="text-foreground font-medium">
                  Record your spoken answer. We transcribe it live and send the
                  transcript for AI evaluation.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-lg">
                {formatTime(elapsed)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {!speech.isSupported && (
                <div className="p-3 rounded-lg bg-tip/10 border border-tip/30 text-sm text-tip">
                  Your browser doesn't support live speech recognition. You can
                  type or paste your spoken answer below instead.
                </div>
              )}

              {/* Record control */}
              <div className="flex flex-col items-center gap-3 py-4">
                <button
                  type="button"
                  onClick={() =>
                    speech.isListening ? speech.stop() : speech.start()
                  }
                  disabled={!speech.isSupported}
                  className={`relative flex items-center justify-center h-20 w-20 rounded-full transition-all duration-300 disabled:opacity-40 ${
                    speech.isListening
                      ? "bg-destructive hover:bg-destructive/90 animate-pulse"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {speech.isListening ? (
                    <MicOff className="h-8 w-8 text-white" />
                  ) : (
                    <Mic className="h-8 w-8 text-white" />
                  )}
                </button>
                <p className="text-sm text-foreground font-medium">
                  {speech.isListening
                    ? "Listening... tap to stop"
                    : "Tap the mic to start recording"}
                </p>
              </div>

              {/* Transcript */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Transcript</span>
                  <Badge
                    variant={wordCount >= MIN_WORDS ? "default" : "secondary"}
                  >
                    {wordCount} words
                  </Badge>
                </div>
                <Textarea
                  value={
                    transcript +
                    (speech.interimTranscript
                      ? (transcript ? " " : "") + speech.interimTranscript
                      : "")
                  }
                  onChange={(e) => speech.setTranscript(e.target.value)}
                  placeholder="Your spoken words will appear here. You can also edit the transcript before submitting."
                  className="min-h-[200px] resize-none"
                />
                {speech.error && (
                  <p className="text-xs text-destructive">
                    Microphone error: {speech.error}
                  </p>
                )}
              </div>

              <div className="flex justify-between items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    speech.reset();
                    setElapsed(0);
                  }}
                >
                  Clear
                </Button>
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isSubmitted}
                  className="min-w-[140px] bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                >
                  {isAnalyzing ? "Analyzing..." : "Get AI Feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar tips */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-secondary" />
                {partLabel} Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tips.map((tip, i) => (
                <div
                  key={i}
                  className="p-3 bg-muted rounded-lg border border-border text-sm text-card-foreground"
                >
                  {tip}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Short response confirmation dialog */}
      <Dialog open={showShortDialog} onOpenChange={setShowShortDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-tip" />
              Response Looks Short
            </DialogTitle>
            <DialogDescription>
              Your transcript has {wordCount} words. Very short answers usually
              receive lower band scores. Consider recording a longer, more
              developed response.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowShortDialog(false)}>
              Keep Practicing
            </Button>
            <Button
              onClick={async () => {
                setShowShortDialog(false);
                await submit();
              }}
              className="bg-tip hover:bg-tip/90 text-tip-foreground"
            >
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SpeakingPractice;

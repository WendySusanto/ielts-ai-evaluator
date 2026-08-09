import { WritingPracticeSkeleton } from "@/components/skeleton/WritingPracticeSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { aggregateAssessments, useSpeech, type TurnAssessment } from "@/hooks/use-speech";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ExaminerTurnRequest,
  ExaminerTurnResult,
  SpeakingEvaluateRequest,
  SpeakingPrompt,
  SpeakingSessionDto,
  SpeakingTurn,
} from "@/types/Speaking";
import { ArrowLeft, Keyboard, Mic, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import NotFound from "./NotFound";

const PART_LABEL: Record<string, string> = {
  Part1: "Part 1",
  Part2: "Part 2",
  Part3: "Part 3",
};

const PREP_SECONDS = 60;
const TALK_SECONDS = 120;

type CallState = "idle" | "examinerSpeaking" | "yourTurn" | "listening" | "thinking";

const STATE_LABEL: Record<CallState, string> = {
  idle: "Idle",
  examinerSpeaking: "Examiner speaking",
  yourTurn: "Your turn",
  listening: "Listening",
  thinking: "Thinking",
};

const formatClock = (totalSeconds: number) => {
  const s = Math.max(totalSeconds, 0);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
};

const SpeakingPractice = () => {
  const { taskId } = useParams<{ part: string; taskId: string }>();
  const navigate = useNavigate();

  const { data: prompt = null, isLoading } = useApi<SpeakingPrompt>(
    `/api/speaking-prompts/${taskId}`,
  );
  const speech = useSpeech();

  const [turns, setTurns] = useState<SpeakingTurn[]>([]);
  const [assessments, setAssessments] = useState<TurnAssessment[]>([]);
  const [callState, setCallState] = useState<CallState>("idle");
  const [partComplete, setPartComplete] = useState(false);
  const [pendingRetryTurns, setPendingRetryTurns] = useState<SpeakingTurn[] | null>(null);
  const [manualTypedMode, setManualTypedMode] = useState(false);
  const [forcedTypedMode, setForcedTypedMode] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);

  // Part 2 cue-card phase: only relevant before the first candidate turn.
  const [part2Phase, setPart2Phase] = useState<"idle" | "prep" | "talk" | "done">("idle");
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [talkLeft, setTalkLeft] = useState(TALK_SECONDS);

  const greetedRef = useRef(false);
  const degradedToastRef = useRef(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const typedMode = forcedTypedMode || manualTypedMode;
  const candidateTurnCount = turns.filter((t) => t.role === "candidate").length;

  // Degrade to typed mode once, on unsupported SDK or a speech error. Ponytail: one toast total,
  // not one per error — repeated Azure hiccups shouldn't spam the user.
  useEffect(() => {
    if ((speech.supported === false || speech.error) && !degradedToastRef.current) {
      degradedToastRef.current = true;
      setForcedTypedMode(true);
      toast.error("Voice isn't available right now — switched to typed answers.");
    }
  }, [speech.supported, speech.error]);

  // Greet once the prompt has loaded (guarded against StrictMode's double-invoke).
  useEffect(() => {
    if (!prompt || greetedRef.current) return;
    greetedRef.current = true;
    setTurns([{ role: "examiner", text: prompt.questionText }]);
    setCallState("examinerSpeaking");
    if (speech.supported && !forcedTypedMode) {
      speech
        .speak(prompt.questionText)
        .catch(() => {})
        .finally(() => setCallState("yourTurn"));
    } else {
      setCallState("yourTurn");
    }
    // forcedTypedMode intentionally omitted: only the initial value at greet time matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, speech.supported, speech.speak]);

  // Auto-scroll to the latest turn / interim transcript.
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, speech.interimTranscript]);

  // Kick off Part 2's prep countdown once the cue card has been presented and it's the
  // candidate's turn to answer it (skipped entirely in typed-mode fallback).
  useEffect(() => {
    if (
      prompt?.part === "Part2" &&
      candidateTurnCount === 0 &&
      callState === "yourTurn" &&
      part2Phase === "idle" &&
      !typedMode
    ) {
      setPrepLeft(PREP_SECONDS);
      setPart2Phase("prep");
    }
  }, [prompt, candidateTurnCount, callState, part2Phase, typedMode]);

  const submitCandidateTurn = async (rawText: string, assessment: TurnAssessment | null) => {
    const text = rawText.trim();
    if (!text) {
      toast.error("Didn't catch that — try again.");
      setCallState("yourTurn");
      return;
    }
    const updatedTurns = [...turns, { role: "candidate", text } as SpeakingTurn];
    setTurns(updatedTurns);
    if (assessment) setAssessments((prev) => [...prev, assessment]);
    await postExaminerTurn(updatedTurns);
  };

  const postExaminerTurn = async (updatedTurns: SpeakingTurn[]) => {
    if (!prompt) return;
    setCallState("thinking");
    setPendingRetryTurns(null);
    try {
      const body: ExaminerTurnRequest = {
        speakingPromptId: prompt.speakingPromptId,
        part: prompt.part,
        turns: updatedTurns,
      };
      const result = await api.post<ExaminerTurnResult>("/api/speaking/examiner-turn", body);
      if (result.partComplete) setPartComplete(true);
      // Backend's turn-cap short-circuit returns partComplete with an empty nextQuestion —
      // nothing to render or speak (speak("") may never fire onAudioEnd).
      if (result.nextQuestion) {
        setTurns((prev) => [...prev, { role: "examiner", text: result.nextQuestion }]);
        setCallState("examinerSpeaking");
        if (speech.supported && !forcedTypedMode) {
          await speech.speak(result.nextQuestion).catch(() => {});
        }
      }
      setCallState("yourTurn");
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, e instanceof Error ? e.message : "Request failed");
      toast.error(`Couldn't reach the examiner: ${err.message}`);
      setPendingRetryTurns(updatedTurns);
      setCallState("yourTurn");
    }
  };

  const handleMicClick = async () => {
    if (callState === "listening") {
      setCallState("thinking");
      const { transcript, assessment } = await speech.stopListening();
      await submitCandidateTurn(transcript, assessment);
      return;
    }
    if (callState !== "yourTurn") return;
    try {
      await speech.startListening();
      setCallState("listening");
    } catch {
      // speech.error effect above already toasts once and falls back to typed mode.
    }
  };

  const handleTypedSend = async () => {
    const text = typedText.trim();
    if (!text || callState !== "yourTurn") return;
    setTypedText("");
    setCallState("thinking");
    await submitCandidateTurn(text, null);
  };

  const finishPart2Talk = async () => {
    if (part2Phase !== "talk") return;
    setPart2Phase("done");
    setCallState("thinking");
    const { transcript, assessment } = await speech.stopListening();
    await submitCandidateTurn(transcript, assessment);
  };

  const handleEndSession = async () => {
    if (!prompt || isSubmittingFinal || candidateTurnCount === 0) return;
    setIsSubmittingFinal(true);
    speech.stopSpeaking();
    // Release the mic if a turn was mid-recording; that partial turn is discarded, not submitted.
    if (callState === "listening") await speech.stopListening();
    const payload: SpeakingEvaluateRequest = {
      speakingPromptId: prompt.speakingPromptId,
      part: prompt.part,
      turns,
    };
    if (assessments.length > 0) payload.pronunciation = aggregateAssessments(assessments);

    try {
      const result = await api.post<SpeakingSessionDto>("/api/v2/speaking/sessions", payload);
      toast.success("Speaking response analyzed successfully!");
      navigate(`/speaking-feedback/${result.speakingSessionId}`);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, e instanceof Error ? e.message : "Request failed");
      toast.error(`Error analyzing response: ${err.message}`);
      setIsSubmittingFinal(false);
    }
  };

  // Part 2 prep countdown -> auto-starts listening once it hits zero.
  useEffect(() => {
    if (part2Phase !== "prep") return;
    if (prepLeft <= 0) {
      // Rare race: a speech error degraded us to typed mode during prep itself. Land on the
      // typed textarea for this answer instead of arming a mic that just went unavailable.
      if (!speech.supported || forcedTypedMode) {
        setPart2Phase("done");
        setCallState("yourTurn");
        return;
      }
      // First mic use happens here (permission prompt / Azure token), so commit to the
      // talk view only once the recognizer is actually live — the talk view has no
      // mic/typed controls to recover with if the start fails.
      speech.startListening().then(
        () => {
          setTalkLeft(TALK_SECONDS);
          setPart2Phase("talk");
          setCallState("listening");
        },
        () => {
          // speech.error effect flips forcedTypedMode + toasts; land on the typed textarea.
          setPart2Phase("done");
          setCallState("yourTurn");
        },
      );
      return;
    }
    const t = setTimeout(() => setPrepLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [part2Phase, prepLeft, speech.supported, speech.startListening, forcedTypedMode]);

  // Part 2 talk countdown -> auto-submits once it hits zero.
  useEffect(() => {
    if (part2Phase !== "talk") return;
    if (talkLeft <= 0) {
      finishPart2Talk();
      return;
    }
    const t = setTimeout(() => setTalkLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [part2Phase, talkLeft]);

  if (isLoading) {
    return <WritingPracticeSkeleton />;
  }

  if (!prompt) {
    return <NotFound />;
  }

  const cuePoints = prompt.cuepoints
    ? prompt.cuepoints.split("\n").filter((c) => c.trim().length > 0)
    : [];
  const showCueCard = prompt.part === "Part2" && candidateTurnCount === 0;
  const micDisabled = callState !== "yourTurn" && callState !== "listening";
  const busy = callState === "thinking";

  return (
    // 8rem of layout chrome: the 4rem sticky header plus MainLayout's py-8.
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {/* The layout header owns the h1 ("Speaking"). */}
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-primary font-semibold">
              {PART_LABEL[prompt.part] ?? prompt.part}
            </p>
            <p className="text-2xl font-bold truncate">{prompt.topic}</p>
          </div>
        </div>
        <Badge variant="secondary" className="gap-2 py-1.5 px-3">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          {STATE_LABEL[callState]}
        </Badge>
      </div>

      {/* Conversation */}
      <div
        ref={chatRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-card p-4"
      >
        {turns.map((turn, i) => (
          <div
            key={i}
            className={cn("flex flex-col", turn.role === "candidate" ? "items-end" : "items-start")}
          >
            <p className="text-xs text-muted-foreground mb-1">
              {turn.role === "candidate" ? "You" : "Examiner"}
            </p>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
                turn.role === "candidate"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {turn.text}
            </div>
          </div>
        ))}
        {speech.interimTranscript && (
          <div className="flex flex-col items-end">
            <p className="text-xs text-muted-foreground mb-1">You</p>
            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm italic opacity-60 bg-secondary text-secondary-foreground">
              {speech.interimTranscript}
            </div>
          </div>
        )}
      </div>

      {/* Part 2 cue card */}
      {showCueCard && (
        <Card className="bg-secondary border-border">
          <CardContent className="pt-4 space-y-2">
            {cuePoints.length > 0 && (
              <ul className="list-disc list-inside space-y-1 text-sm text-secondary-foreground">
                {cuePoints.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            )}
            {part2Phase === "prep" && (
              <Badge variant="outline">
                {prepLeft <= 0 ? "Starting mic…" : `Prep time: ${formatClock(prepLeft)}`}
              </Badge>
            )}
            {part2Phase === "talk" && (
              <Badge variant="outline">Speaking: {formatClock(talkLeft)}</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Controls dock */}
      <div className="sticky bottom-0 space-y-3 border-t border-border bg-background pt-3">
        {part2Phase === "talk" ? (
          <div className="flex justify-center">
            <Button variant="outline" className="h-11" onClick={finishPart2Talk} disabled={busy}>
              Finish early
            </Button>
          </div>
        ) : pendingRetryTurns ? (
          <div className="flex justify-center">
            <Button className="h-11" onClick={() => postExaminerTurn(pendingRetryTurns)} disabled={busy}>
              Retry
            </Button>
          </div>
        ) : part2Phase === "prep" || partComplete ? null : typedMode ? (
          <div className="flex items-end gap-2">
            <Textarea
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Type your answer..."
              disabled={callState !== "yourTurn"}
              className="min-h-11 max-h-32 resize-none"
            />
            <Button
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={handleTypedSend}
              disabled={callState !== "yourTurn" || !typedText.trim()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
            {!forcedTypedMode && (
              <Button variant="ghost" className="h-11 shrink-0" onClick={() => setManualTypedMode(false)}>
                Use mic
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleMicClick}
              disabled={micDisabled}
              aria-label={callState === "listening" ? "Stop and send" : "Start recording"}
              className={cn(
                "flex size-14 items-center justify-center rounded-full transition-transform duration-200 disabled:opacity-40",
                callState === "listening" ? "bg-destructive animate-pulse" : "bg-primary hover:bg-primary/90",
              )}
            >
              {callState === "listening" ? (
                <Square className="h-5 w-5 text-destructive-foreground" />
              ) : (
                <Mic className="h-5 w-5 text-primary-foreground" />
              )}
            </button>
            <Button variant="ghost" className="h-11" onClick={() => setManualTypedMode(true)}>
              <Keyboard />
              Type instead
            </Button>
          </div>
        )}

        <Button
          className="w-full h-11"
          disabled={candidateTurnCount === 0 || isSubmittingFinal || busy}
          onClick={handleEndSession}
        >
          {isSubmittingFinal ? "Submitting..." : "End session & get feedback"}
        </Button>
      </div>
    </div>
  );
};

export default SpeakingPractice;

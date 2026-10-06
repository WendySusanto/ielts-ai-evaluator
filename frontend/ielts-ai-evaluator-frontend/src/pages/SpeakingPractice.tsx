import { WritingPracticeSkeleton } from "@/components/skeleton/WritingPracticeSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { EvaluationProgress } from "@/components/EvaluationProgress";
import { RecordingClock } from "@/components/RecordingClock";
import { VoiceLevelBars } from "@/components/VoiceLevelBars";
import { useApi } from "@/hooks/use-api";
import {
  aggregateAssessments,
  useSpeech,
  type RecordedAudio,
  type TurnAssessment,
} from "@/hooks/use-speech";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type {
  ExaminerTurnRequest,
  ExaminerTurnResult,
  SpeakingEvaluateRequest,
  SpeakingEvaluationStatus,
  SpeakingPrompt,
  SpeakingSessionDto,
  SpeakingTurn,
} from "@/types/Speaking";
import { ArrowLeft, Keyboard, Mic, Send, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
// Quiet time after the candidate's last word before the turn is sent. Long enough for a
// mid-answer thinking pause; the mic button still stops a turn early.
const SILENCE_MS = 3000;
// Mirrors ExaminerService's hard cap on examiner turns per part — the examiner can't ask more
// than this, so it's what the progress bar counts against.
const MAX_QUESTIONS: Record<string, number> = { Part2: 3 };
const MAX_QUESTIONS_DEFAULT = 8;
// A resumable session goes stale after a day — past that, restoring a half-forgotten
// conversation is more confusing than starting clean.
const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
// Recording a session may send to the scorer — about a real Part 1 or Part 3. A warning comes 30
// seconds before; at the limit the answer in progress is sent and the part ends.
const RECORDING_LIMIT_SECONDS = 5 * 60;
const RECORDING_WARNING_SECONDS = 30;

/** A recording as base64, the way the evaluation request carries it. */
const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

type SpeakingDraft = {
  turns: SpeakingTurn[];
  assessments: TurnAssessment[];
  partComplete: boolean;
  savedAt: number;
  clientSessionId?: string;
  /** Set once the session was sent for scoring, so a reload resumes the progress card. */
  submittedAt?: number;
};

const readDraft = (key: string): SpeakingDraft | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const draft = JSON.parse(raw) as SpeakingDraft;
    if (Date.now() - draft.savedAt > DRAFT_TTL_MS || !draft.turns?.length) {
      localStorage.removeItem(key);
      return null;
    }
    return draft;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

type CallState =
  | "idle"
  | "examinerSpeaking"
  | "yourTurn"
  | "listening"
  | "thinking";

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
  const [pendingRetryTurns, setPendingRetryTurns] = useState<
    SpeakingTurn[] | null
  >(null);
  const [manualTypedMode, setManualTypedMode] = useState(false);
  const [forcedTypedMode, setForcedTypedMode] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false);
  // Sent with the final evaluation: a retried submission reuses it, so the server hands back the
  // saved result instead of scoring twice. Kept in the draft for the same reason.
  const [clientSessionId, setClientSessionId] = useState<string>(() => crypto.randomUUID());
  // Each answer's recording, by answer number. Memory only — too big for the localStorage draft — so
  // a resumed session scores its earlier answers from the recognizer text.
  const recordingsRef = useRef(new Map<number, RecordedAudio>());
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const recordingWarnedRef = useRef(false);
  // The session is being scored: the POST does the work but is not waited on — the server keeps
  // going if the connection drops or the tab closes — so the poll below decides when it is done.
  // Non-null swaps the controls for the progress card; startedAt survives a reload via the draft.
  const [evaluation, setEvaluation] = useState<{
    startedAt: number;
    error: string | null;
  } | null>(null);
  const evaluationFinishedRef = useRef(false);

  // Part 2 cue-card phase: only relevant before the first candidate turn.
  const [part2Phase, setPart2Phase] = useState<
    "idle" | "prep" | "talk" | "done"
  >("idle");
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [talkLeft, setTalkLeft] = useState(TALK_SECONDS);

  const greetedRef = useRef(false);
  const degradedToastRef = useRef(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const typedMode = forcedTypedMode || manualTypedMode;
  const candidateTurnCount = turns.filter((t) => t.role === "candidate").length;
  const draftKey = prompt ? `draft:speaking:${prompt.speakingPromptId}` : null;

  // Degrade to typed mode on unsupported SDK or a speech error. Ponytail: one toast until the
  // user opts back into voice ("Use mic" re-arms it) — repeated Azure hiccups shouldn't spam.
  const degradeToTyped = () => {
    setForcedTypedMode(true);
    if (degradedToastRef.current) return;
    degradedToastRef.current = true;
    toast.error("Voice isn't available right now — switched to typed answers.");
  };

  useEffect(() => {
    if (speech.supported === false || speech.error) degradeToTyped();
  }, [speech.supported, speech.error]);

  // Greet once the prompt has loaded (guarded against StrictMode's double-invoke).
  useEffect(() => {
    if (!prompt || greetedRef.current) return;
    greetedRef.current = true;
    // A session left behind by a reload, a closed tab, or a failed final submit resumes where it
    // stopped instead of greeting from scratch — the transcript is the expensive part.
    const key = `draft:speaking:${prompt.speakingPromptId}`;
    const draft = readDraft(key);
    if (draft) {
      setTurns(draft.turns);
      setAssessments(draft.assessments);
      setPartComplete(draft.partComplete);
      if (draft.clientSessionId) setClientSessionId(draft.clientSessionId);
      if (draft.submittedAt) {
        // Sent for scoring before the reload: pick the scoring back up, not the conversation.
        setIsSubmittingFinal(true);
        setEvaluation({ startedAt: draft.submittedAt, error: null });
      }
      if (prompt.part === "Part2") setPart2Phase("done");
      setCallState("yourTurn");
      toast.info("Resumed your previous session.", {
        action: {
          label: "Start over",
          onClick: () => {
            localStorage.removeItem(key);
            window.location.reload();
          },
        },
      });
      return;
    }
    const cues = prompt.cuepoints
      ? prompt.cuepoints
          .split("\n")
          .map((c) => c.trim())
          .filter(Boolean)
      : [];
    // Part 1/3 hold their scripted questions in cuepoints and are asked one at a time like the
    // real test, so the opener is the lead-in plus the first question only — the examiner
    // endpoint works down the rest of the list. Part 2's cue card is delivered whole.
    const opening =
      prompt.part === "Part2"
        ? prompt.questionText
        : [prompt.questionText, cues[0]].filter(Boolean).join(" ");
    setTurns([{ role: "examiner", text: opening }]);
    setCallState("examinerSpeaking");
    if (speech.supported && !forcedTypedMode) {
      // Part 2: read the cue card aloud like a real examiner; the chat keeps just the question
      // since the card is already on screen.
      const spoken =
        prompt.part === "Part2" && cues.length
          ? `${prompt.questionText} ${cues.join(", ")}.`
          : opening;
      speech
        .speak(spoken)
        .catch(() => {})
        .finally(() => setCallState("yourTurn"));
    } else {
      setCallState("yourTurn");
    }
    // forcedTypedMode intentionally omitted: only the initial value at greet time matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, speech.supported, speech.speak]);

  // Persist after every turn so the conversation survives a reload or a failed final submit.
  useEffect(() => {
    if (!draftKey || turns.length === 0) return;
    const draft: SpeakingDraft = {
      turns,
      assessments,
      partComplete,
      savedAt: Date.now(),
      clientSessionId,
      submittedAt: evaluation?.startedAt,
    };
    // ponytail: best-effort — a full/blocked quota shouldn't break a live session.
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [draftKey, turns, assessments, partComplete, clientSessionId, evaluation]);

  // Auto-scroll to the latest turn / interim transcript.
  useEffect(() => {
    chatRef.current?.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
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

  const submitCandidateTurn = async (
    rawText: string,
    assessment: TurnAssessment | null,
    {
      spoken,
      audio,
      endPart = false,
    }: {
      spoken?: Pick<SpeakingTurn, "lexical" | "durationSeconds">;
      audio?: RecordedAudio | null;
      /** The recording limit was reached: keep this answer, ask nothing more. */
      endPart?: boolean;
    } = {},
  ) => {
    const text = rawText.trim();
    if (!text) {
      if (!endPart) toast.error("Didn't catch that — try again.");
      if (endPart) setPartComplete(true);
      setCallState("yourTurn");
      return;
    }
    const updatedTurns = [
      ...turns,
      { role: "candidate", text, ...spoken } as SpeakingTurn,
    ];
    setTurns(updatedTurns);
    if (assessment) setAssessments((prev) => [...prev, assessment]);
    if (audio) {
      const answerNumber = updatedTurns.filter((t) => t.role === "candidate").length;
      recordingsRef.current.set(answerNumber, audio);
      setRecordedSeconds((total) => total + audio.seconds);
    }
    if (endPart) {
      setPartComplete(true);
      setCallState("yourTurn");
      return;
    }
    await postExaminerTurn(updatedTurns);
  };

  /** Sends what stopListening heard as the candidate's turn. */
  const submitSpokenTurn = (
    heard: Awaited<ReturnType<typeof speech.stopListening>>,
    endPart = false,
  ) =>
    submitCandidateTurn(heard.transcript, heard.assessment, {
      spoken: heard.lexical
        ? { lexical: heard.lexical, durationSeconds: heard.durationSeconds }
        : undefined,
      audio: heard.audio,
      endPart,
    });

  const postExaminerTurn = async (updatedTurns: SpeakingTurn[]) => {
    if (!prompt) return;
    setCallState("thinking");
    setPendingRetryTurns(null);
    try {
      const body: ExaminerTurnRequest = {
        speakingPromptId: prompt.speakingPromptId,
        part: prompt.part,
        // The examiner only needs to read the conversation; the raw lexical text is for
        // scoring. Dropping it keeps this per-turn call — the one the candidate waits on —
        // from carrying a second copy of every answer, and it counts against the same cap.
        turns: updatedTurns.map(({ role, text }) => ({ role, text })),
      };
      const result = await api.post<ExaminerTurnResult>(
        "/api/speaking/examiner-turn",
        body,
      );
      if (result.partComplete) setPartComplete(true);
      // Backend's turn-cap short-circuit returns partComplete with an empty nextQuestion —
      // nothing to render or speak (speak("") may never fire onAudioEnd).
      if (result.nextQuestion) {
        setTurns((prev) => [
          ...prev,
          { role: "examiner", text: result.nextQuestion },
        ]);
        setCallState("examinerSpeaking");
        if (speech.supported && !forcedTypedMode) {
          await speech.speak(result.nextQuestion).catch(() => {});
        }
      }
      setCallState("yourTurn");
    } catch (e) {
      const err =
        e instanceof ApiError
          ? e
          : new ApiError(0, e instanceof Error ? e.message : "Request failed");
      toast.error(`Couldn't reach the examiner: ${err.message}`);
      setPendingRetryTurns(updatedTurns);
      setCallState("yourTurn");
    }
  };

  const handleMicClick = async () => {
    if (callState === "listening") {
      setCallState("thinking");
      await submitSpokenTurn(await speech.stopListening());
      return;
    }
    if (callState !== "yourTurn") return;
    try {
      await speech.startListening({
        onSilence: () => onSilenceRef.current(),
        silenceMs: SILENCE_MS,
      });
      setCallState("listening");
    } catch {
      degradeToTyped();
    }
  };

  // Silence ends the turn exactly like pressing stop. Kept in a ref so the recognizer's timer
  // always calls the latest render's handler, not the one captured when listening started.
  const onSilenceRef = useRef<() => void>(() => {});
  useEffect(() => {
    onSilenceRef.current = () => {
      if (callState === "listening") handleMicClick();
    };
  });

  // The recording limit, armed while the mic is open: a one-time warning shortly before, and at the
  // limit the answer in progress is sent and the part ends. A ref, like onSilence, so the timer
  // always calls the latest render's handler.
  const onRecordingLimitRef = useRef<() => void>(() => {});
  useEffect(() => {
    onRecordingLimitRef.current = async () => {
      if (callState !== "listening") return;
      setCallState("thinking");
      if (part2Phase === "talk") setPart2Phase("done");
      toast.info("That's five minutes of recording — this part is complete.");
      await submitSpokenTurn(await speech.stopListening(), true);
    };
  });
  useEffect(() => {
    if (callState !== "listening") return;
    const remainingMs = (RECORDING_LIMIT_SECONDS - recordedSeconds) * 1000;
    const warning = recordingWarnedRef.current
      ? undefined
      : setTimeout(() => {
          recordingWarnedRef.current = true;
          toast.warning("Less than 30 seconds of recording left.");
        }, Math.max(remainingMs - RECORDING_WARNING_SECONDS * 1000, 0));
    const limit = setTimeout(() => onRecordingLimitRef.current(), Math.max(remainingMs, 0));
    return () => {
      clearTimeout(warning);
      clearTimeout(limit);
    };
  }, [callState, recordedSeconds]);

  // Hands-free: open the mic as soon as it's the candidate's turn. Part 2's first long turn is
  // left to the prep countdown, which starts listening itself (without a silence cutoff).
  useEffect(() => {
    if (
      callState !== "yourTurn" ||
      !speech.supported ||
      typedMode ||
      partComplete ||
      pendingRetryTurns ||
      isSubmittingFinal ||
      (prompt?.part === "Part2" && candidateTurnCount === 0)
    )
      return;
    handleMicClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    callState,
    typedMode,
    partComplete,
    pendingRetryTurns,
    isSubmittingFinal,
    candidateTurnCount,
  ]);

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
    await submitSpokenTurn(await speech.stopListening());
  };

  // The session is saved under clientSessionId, so that is where its feedback lives.
  const finishEvaluation = useCallback(() => {
    if (evaluationFinishedRef.current) return; // the POST and the poll can both report it done
    evaluationFinishedRef.current = true;
    if (draftKey) localStorage.removeItem(draftKey);
    toast.success("Speaking response analyzed successfully!");
    navigate(`/speaking-feedback/${clientSessionId}`);
  }, [draftKey, navigate, clientSessionId]);

  const handleEndSession = async () => {
    if (!prompt || candidateTurnCount === 0) return;
    if (evaluation && !evaluation.error) return; // already being scored
    setIsSubmittingFinal(true);
    speech.stopSpeaking();
    // Release the mic if a turn was mid-recording (or the hands-free start is still in flight);
    // that partial turn is discarded, not submitted. A no-op when nothing is listening.
    await speech.stopListening();
    const payload: SpeakingEvaluateRequest = {
      speakingPromptId: prompt.speakingPromptId,
      part: prompt.part,
      turns,
      clientSessionId,
    };
    if (assessments.length > 0)
      payload.pronunciation = aggregateAssessments(assessments);

    try {
      // Every recorded answer goes with the transcript, so the scorer hears what was said rather
      // than what the recognizer made of it.
      const audio = await Promise.all(
        [...recordingsRef.current].map(async ([answer, recording]) => ({
          answer,
          mimeType: recording.blob.type,
          seconds: Math.round(recording.seconds * 10) / 10,
          data: await blobToBase64(recording.blob),
        })),
      );
      if (audio.length > 0) payload.audio = audio;
    } catch {
      toast.error("Couldn't prepare your recordings — please try again.");
      setIsSubmittingFinal(false);
      return;
    }

    setEvaluation({ startedAt: Date.now(), error: null });
    api.post<SpeakingSessionDto>("/api/v2/speaking/sessions", payload).then(
      finishEvaluation,
      (e) => {
        // Refused before scoring began (invalid, over quota): the poll would only ever see a 404,
        // so say so now. A 409 means an earlier attempt is still running, and anything else may
        // well have reached the server — for those the poll decides.
        if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 409)
          setEvaluation((current) => current && { ...current, error: e.message });
      },
    );
  };

  // While the session is scored: ask the server every 3 seconds. A 404 is normal for a moment —
  // the POST may still be uploading — but a minute of it means the answers never arrived.
  useEffect(() => {
    if (!evaluation || evaluation.error) return;
    let missingSince: number | null = null;
    const poll = setInterval(async () => {
      try {
        const status = await api.get<SpeakingEvaluationStatus>(
          `/api/v2/speaking/evaluations/${clientSessionId}`,
        );
        if (status.status === "completed") finishEvaluation();
        else if (status.status === "failed")
          setEvaluation(
            (current) =>
              current && {
                ...current,
                error: status.error ?? "Scoring failed. Please try again.",
              },
          );
      } catch (e) {
        if (!(e instanceof ApiError && e.status === 404)) return; // a network blip: keep polling
        missingSince ??= Date.now();
        if (Date.now() - missingSince > 60_000)
          setEvaluation(
            (current) =>
              current && {
                ...current,
                error: "Your answers didn't reach the server. Please try again.",
              },
          );
      }
    }, 3000);
    return () => clearInterval(poll);
  }, [evaluation, clientSessionId, finishEvaluation]);

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
  }, [
    part2Phase,
    prepLeft,
    speech.supported,
    speech.startListening,
    forcedTypedMode,
  ]);

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
  const questionCap = MAX_QUESTIONS[prompt.part] ?? MAX_QUESTIONS_DEFAULT;
  // The examiner can wrap up early, so a completed part shows a full bar regardless of count.
  const questionsAsked = partComplete
    ? questionCap
    : Math.min(turns.filter((t) => t.role === "examiner").length, questionCap);
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

      {/* Question progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Questions</span>
          <span className="font-medium tabular-nums">
            {questionsAsked}/{questionCap}
          </span>
        </div>
        <Progress value={(questionsAsked / questionCap) * 100} />
      </div>

      {/* Conversation */}
      <div
        ref={chatRef}
        className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-card p-4"
      >
        {turns.map((turn, i) => (
          <div
            key={i}
            className={cn(
              "flex flex-col",
              turn.role === "candidate" ? "items-end" : "items-start",
            )}
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
                {prepLeft <= 0
                  ? "Starting mic…"
                  : `Prep time: ${formatClock(prepLeft)}`}
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
        {evaluation ? (
          <EvaluationProgress
            startedAt={evaluation.startedAt}
            error={evaluation.error}
            onRetry={handleEndSession}
          />
        ) : (
          <>
            {part2Phase === "talk" ? (
              <div className="flex items-center justify-center gap-3">
                <RecordingClock
                  recordedSeconds={recordedSeconds}
                  running={callState === "listening"}
                  limitSeconds={RECORDING_LIMIT_SECONDS}
                />
                {callState === "listening" && (
                  <VoiceLevelBars getLevel={speech.getMicLevel} />
                )}
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={finishPart2Talk}
                  disabled={busy}
                >
                  Finish early
                </Button>
              </div>
            ) : pendingRetryTurns ? (
              <div className="flex justify-center">
                <Button
                  className="h-11"
                  onClick={() => postExaminerTurn(pendingRetryTurns)}
                  disabled={busy}
                >
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
                {speech.supported && (
                  <Button
                    variant="ghost"
                    className="h-11 shrink-0"
                    onClick={() => {
                      // Also recovers from a speech error: one hiccup shouldn't cost voice for the session.
                      degradedToastRef.current = false;
                      setForcedTypedMode(false);
                      setManualTypedMode(false);
                    }}
                  >
                    Use mic
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                {/* A fixed slot, so the clock and bars appearing never shift the mic button. */}
                <div className="flex w-36 items-center justify-end gap-2">
                  {(callState === "listening" || recordedSeconds > 0) && (
                    <RecordingClock
                      recordedSeconds={recordedSeconds}
                      running={callState === "listening"}
                      limitSeconds={RECORDING_LIMIT_SECONDS}
                    />
                  )}
                  {callState === "listening" && (
                    <VoiceLevelBars getLevel={speech.getMicLevel} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={micDisabled}
                  aria-label={
                    callState === "listening" ? "Stop and send" : "Start recording"
                  }
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full transition-transform duration-200 disabled:opacity-40",
                    callState === "listening"
                      ? "bg-destructive"
                      : "bg-primary hover:bg-primary/90",
                  )}
                >
                  {callState === "listening" ? (
                    <Square className="h-5 w-5 text-destructive-foreground" />
                  ) : (
                    <Mic className="h-5 w-5 text-primary-foreground" />
                  )}
                </button>
                <Button
                  variant="ghost"
                  className="h-11"
                  onClick={() => setManualTypedMode(true)}
                >
                  <Keyboard />
                  Type instead
                </Button>
              </div>
            )}
    
            {!typedMode && candidateTurnCount === 0 && (
              <p className="text-center text-xs text-muted-foreground">
                Your spoken answers are recorded for scoring and can be replayed on
                your feedback page.
              </p>
            )}
            <Button
              className="w-full h-11"
              disabled={candidateTurnCount === 0 || isSubmittingFinal || busy}
              onClick={handleEndSession}
            >
              {isSubmittingFinal ? "Submitting..." : "End session & get feedback"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeakingPractice;

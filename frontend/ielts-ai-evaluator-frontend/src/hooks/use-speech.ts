import { api } from "@/lib/api";
import type { PronunciationResult, PronunciationWord, SpeechToken } from "@/types/Speaking";
import {
  AudioConfig,
  CancellationDetails,
  PronunciationAssessmentConfig,
  PronunciationAssessmentGradingSystem,
  PronunciationAssessmentGranularity,
  PronunciationAssessmentResult,
  ResultReason,
  SpeakerAudioDestination,
  SpeechConfig,
  SpeechRecognizer,
  SpeechSynthesizer,
} from "microsoft-cognitiveservices-speech-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

// Azure STS tokens expire after 10 min; refresh a couple of minutes early.
const TOKEN_TTL_MS = 8 * 60 * 1000;
const MAX_WORDS = 400;

/** Per-turn pronunciation assessment: same shape as PronunciationResult minus the
 * server-computed band, so it doubles as the input aggregateAssessments merges across turns. */
export type TurnAssessment = Omit<PronunciationResult, "band">;

let cachedToken: { value: SpeechToken; expiresAt: number } | null = null;

async function getSpeechToken(): Promise<SpeechToken> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  const value = await api.get<SpeechToken>("/api/speech/token");
  cachedToken = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
  return value;
}

/** Word-count-weights the five PA scores across turns/segments and concatenates their words
 * (capped at MAX_WORDS). Used both to merge recognized segments within one candidate turn and,
 * by callers, to merge turns into the single aggregate the backend expects. */
export function aggregateAssessments(turns: TurnAssessment[]): PronunciationResult {
  const weights = turns.map((t) => t.words.length || 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0) || 1;
  const weighted = (pick: (t: TurnAssessment) => number) =>
    turns.reduce((sum, t, i) => sum + pick(t) * weights[i], 0) / totalWeight;

  return {
    pronunciationScore: weighted((t) => t.pronunciationScore),
    accuracyScore: weighted((t) => t.accuracyScore),
    fluencyScore: weighted((t) => t.fluencyScore),
    prosodyScore: weighted((t) => t.prosodyScore),
    completenessScore: weighted((t) => t.completenessScore),
    words: turns.flatMap((t) => t.words).slice(0, MAX_WORDS),
  };
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface UseSpeechResult {
  supported: boolean;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  startListening: () => Promise<void>;
  stopListening: () => Promise<{ transcript: string; assessment: TurnAssessment | null }>;
  interimTranscript: string;
  error: string | null;
}

/** Azure Speech SDK integration: TTS for the examiner's voice, STT + Pronunciation Assessment
 * for the candidate's turn. One hook, no extra layers around the SDK. */
export function useSpeech(): UseSpeechResult {
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const synthesizerRef = useRef<SpeechSynthesizer | null>(null);
  const playerRef = useRef<SpeakerAudioDestination | null>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const segmentsRef = useRef<string[]>([]);
  const segmentAssessmentsRef = useRef<TurnAssessment[]>([]);

  const [supported] = useState(
    () => typeof navigator !== "undefined" && !!navigator.mediaDevices,
  );

  const stopSpeaking = useCallback(() => {
    playerRef.current?.close();
    synthesizerRef.current?.close();
    playerRef.current = null;
    synthesizerRef.current = null;
  }, []);

  const speak = useCallback(
    async (text: string) => {
      setError(null);
      stopSpeaking();
      try {
        const { token, region, voice } = await getSpeechToken();
        const speechConfig = SpeechConfig.fromAuthorizationToken(token, region);
        speechConfig.speechSynthesisVoiceName = voice;

        const player = new SpeakerAudioDestination();
        const audioConfig = AudioConfig.fromSpeakerOutput(player);
        const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
        synthesizerRef.current = synthesizer;
        playerRef.current = player;

        await new Promise<void>((resolve, reject) => {
          player.onAudioEnd = () => resolve();
          synthesizer.speakTextAsync(
            text,
            (result) => {
              if (result.reason !== ResultReason.SynthesizingAudioCompleted) {
                const details = CancellationDetails.fromResult(result);
                reject(new Error(details.errorDetails || "Speech synthesis failed"));
              }
            },
            (err) => reject(new Error(err)),
          );
        });
      } catch (e) {
        setError(toMessage(e));
        throw e;
      } finally {
        synthesizerRef.current?.close();
        playerRef.current?.close();
        synthesizerRef.current = null;
        playerRef.current = null;
      }
    },
    [stopSpeaking],
  );

  const startListening = useCallback(async () => {
    setError(null);
    setInterimTranscript("");
    segmentsRef.current = [];
    segmentAssessmentsRef.current = [];

    try {
      const { token, region } = await getSpeechToken();
      const speechConfig = SpeechConfig.fromAuthorizationToken(token, region);
      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechRecognizer(speechConfig, audioConfig);

      const paConfig = new PronunciationAssessmentConfig(
        "",
        PronunciationAssessmentGradingSystem.HundredMark,
        PronunciationAssessmentGranularity.Word,
      );
      paConfig.enableProsodyAssessment = true;
      paConfig.applyTo(recognizer);

      recognizer.recognizing = (_sender, e) => {
        setInterimTranscript(e.result.text);
      };
      recognizer.recognized = (_sender, e) => {
        if (e.result.reason !== ResultReason.RecognizedSpeech) return;
        const text = e.result.text.trim();
        if (!text) return;

        segmentsRef.current.push(text);
        const pa = PronunciationAssessmentResult.fromResult(e.result);
        const words: PronunciationWord[] = pa.detailResult.Words.map((w) => ({
          word: w.Word,
          accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
          errorType: w.PronunciationAssessment?.ErrorType ?? "None",
        }));
        segmentAssessmentsRef.current.push({
          pronunciationScore: pa.pronunciationScore,
          accuracyScore: pa.accuracyScore,
          fluencyScore: pa.fluencyScore,
          prosodyScore: pa.prosodyScore,
          completenessScore: pa.completenessScore,
          words,
        });
        setInterimTranscript("");
      };
      recognizer.canceled = (_sender, e) => {
        setError(e.errorDetails || "Speech recognition was canceled");
      };

      recognizerRef.current = recognizer;

      await new Promise<void>((resolve, reject) => {
        recognizer.startContinuousRecognitionAsync(resolve, (err) => reject(new Error(err)));
      });
    } catch (e) {
      setError(toMessage(e));
      throw e;
    }
  }, []);

  const stopListening = useCallback(async () => {
    const recognizer = recognizerRef.current;
    if (!recognizer) return { transcript: "", assessment: null };

    try {
      await new Promise<void>((resolve, reject) => {
        recognizer.stopContinuousRecognitionAsync(resolve, (err) => reject(new Error(err)));
      });
    } catch (e) {
      setError(toMessage(e));
    } finally {
      recognizer.close();
      recognizerRef.current = null;
      setInterimTranscript("");
    }

    const transcript = segmentsRef.current.join(" ").trim();
    const assessment =
      segmentAssessmentsRef.current.length > 0
        ? aggregateAssessments(segmentAssessmentsRef.current)
        : null;
    return { transcript, assessment };
  }, []);

  // Dispose any live SDK objects (they hold the mic/speaker) if the component unmounts mid-turn.
  useEffect(() => {
    return () => {
      recognizerRef.current?.close();
      synthesizerRef.current?.close();
      playerRef.current?.close();
    };
  }, []);

  return {
    supported,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    interimTranscript,
    error,
  };
}

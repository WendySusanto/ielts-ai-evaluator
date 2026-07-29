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

// SDK close() throws on already-disposed objects; disposal paths can legitimately race
// (e.g. stopSpeaking vs. speak's own cleanup), so swallow that.
function safeClose(obj: { close: () => void } | null): void {
  try {
    obj?.close();
  } catch {
    // already disposed
  }
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
  // In-flight startListening(); stopListening() awaits it so a fast start-then-stop
  // can't leave a recognizer that came up live after stop already returned.
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const disposedRef = useRef(false);
  const segmentsRef = useRef<string[]>([]);
  const segmentAssessmentsRef = useRef<TurnAssessment[]>([]);

  const [supported] = useState(
    () => typeof navigator !== "undefined" && !!navigator.mediaDevices,
  );

  const stopSpeaking = useCallback(() => {
    const player = playerRef.current;
    const synthesizer = synthesizerRef.current;
    playerRef.current = null;
    synthesizerRef.current = null;
    // close() alone does NOT cut playback: it just ends the media stream, and the <audio>
    // element keeps talking until it drains what it already buffered. pause() is the real
    // stop. Because a paused element never fires 'ended', the SDK never raises onAudioEnd —
    // the only thing that resolves an in-flight speak() — so raise it by hand. speak()'s
    // finally block may close these again; safeClose makes the double-close harmless.
    player?.pause();
    safeClose(player);
    safeClose(synthesizer);
    player?.onAudioEnd?.(player);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      setError(null);
      stopSpeaking(); // interrupt any in-flight synthesis so two speaks never overlap
      let synthesizer: SpeechSynthesizer | null = null;
      let player: SpeakerAudioDestination | null = null;
      try {
        const { token, region, voice } = await getSpeechToken();
        // Unmounted while the token was in flight — the refs cleanup already ran, so building
        // a player now would start audio nothing is left holding a handle to.
        if (disposedRef.current) return;
        const speechConfig = SpeechConfig.fromAuthorizationToken(token, region);
        speechConfig.speechSynthesisVoiceName = voice;

        player = new SpeakerAudioDestination();
        const audioConfig = AudioConfig.fromSpeakerOutput(player);
        synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
        synthesizerRef.current = synthesizer;
        playerRef.current = player;

        const localPlayer = player;
        const localSynthesizer = synthesizer;
        await new Promise<void>((resolve, reject) => {
          localPlayer.onAudioEnd = () => resolve();
          localSynthesizer.speakTextAsync(
            text,
            (result) => {
              if (result.reason !== ResultReason.SynthesizingAudioCompleted) {
                const details = CancellationDetails.fromResult(result);
                reject(new Error(details.errorDetails || "Speech synthesis failed"));
                return;
              }
              // Synthesis done, but playback isn't. onAudioEnd only fires once MediaSource
              // has had endOfStream() called, and the SDK gates that behind isClosed — which
              // nothing but close() sets, and which it never calls for a speaker destination
              // passed via AudioConfig. Without this the promise waits forever. close() does
              // not cut playback short: the element drains its buffer, then fires 'ended'.
              localPlayer.close();
            },
            (err) => reject(new Error(err)),
          );
        });
      } catch (e) {
        setError(toMessage(e));
        throw e;
      } finally {
        // Dispose THIS call's objects, not whatever the shared refs point at — a newer
        // overlapping speak() may already own the refs. Only clear refs we still own.
        safeClose(synthesizer);
        safeClose(player);
        if (synthesizerRef.current === synthesizer) synthesizerRef.current = null;
        if (playerRef.current === player) playerRef.current = null;
      }
    },
    [stopSpeaking],
  );

  const startListening = useCallback(async () => {
    // ponytail: re-entrant start is a no-op — one recognizer per hook is all the
    // examiner-call UI needs, and it can't orphan a live mic.
    if (recognizerRef.current || startPromiseRef.current) return;

    setError(null);
    setInterimTranscript("");
    segmentsRef.current = [];
    segmentAssessmentsRef.current = [];

    const startPromise = (async () => {
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

      try {
        await new Promise<void>((resolve, reject) => {
          recognizer.startContinuousRecognitionAsync(resolve, (err) => reject(new Error(err)));
        });
      } catch (e) {
        safeClose(recognizer); // never leak a recognizer whose start failed
        throw e;
      }

      // Commit only after the recognizer is fully live; stopListening awaits
      // startPromiseRef, so it always sees either null or a started recognizer.
      if (disposedRef.current) {
        // component unmounted mid-start: release the mic instead of committing
        recognizer.stopContinuousRecognitionAsync(
          () => safeClose(recognizer),
          () => safeClose(recognizer),
        );
        return;
      }
      recognizerRef.current = recognizer;
    })();

    startPromiseRef.current = startPromise;
    try {
      await startPromise;
    } catch (e) {
      setError(toMessage(e));
      throw e;
    } finally {
      startPromiseRef.current = null;
    }
  }, []);

  const stopListening = useCallback(async () => {
    // A stop issued during startup waits for the start to land, then stops it.
    if (startPromiseRef.current) {
      try {
        await startPromiseRef.current;
      } catch {
        // failed start already cleaned itself up; nothing to stop
      }
    }

    const recognizer = recognizerRef.current;
    if (!recognizer) return { transcript: "", assessment: null };
    recognizerRef.current = null; // claim it so a concurrent stop can't double-dispose

    try {
      await new Promise<void>((resolve, reject) => {
        recognizer.stopContinuousRecognitionAsync(resolve, (err) => reject(new Error(err)));
      });
    } catch (e) {
      setError(toMessage(e));
    } finally {
      safeClose(recognizer);
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
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      safeClose(recognizerRef.current);
      stopSpeaking(); // pauses playback; a bare close() would let it finish the sentence
    };
  }, [stopSpeaking]);

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

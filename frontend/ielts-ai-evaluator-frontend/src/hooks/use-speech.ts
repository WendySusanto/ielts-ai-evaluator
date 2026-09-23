import { api } from "@/lib/api";
import { buildLexicalTranscript, speakingSeconds, type TimedWord } from "@/lib/lexical";
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

/** Azure's detailed recognition JSON, of which we want only the raw text and the word timings. */
interface DetailedPhrase {
  NBest?: { Lexical?: string; Words?: TimedWord[] }[];
}

/** Per-turn pronunciation assessment: same shape as PronunciationResult minus the
 * server-computed fields, so it doubles as the input aggregateAssessments merges across turns. */
export type TurnAssessment = Omit<PronunciationResult, "band" | "wordsPerMinute">;

let cachedToken: { value: SpeechToken; expiresAt: number } | null = null;
// The in-flight request, shared by every concurrent caller. Caching only the *resolved* value
// deduplicated nothing while a request was still open: the mount prefetch (twice under
// StrictMode), the greeting's speak() and the first startListening() all started before any of
// them had answered, so each fired its own /api/speech/token — four per session against a
// 30/hour cap. A 429 then cleared cachedToken, so the next attempt fired again.
let inFlightToken: Promise<SpeechToken> | null = null;

function getSpeechToken(): Promise<SpeechToken> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) return Promise.resolve(cachedToken.value);
  inFlightToken ??= api
    .get<SpeechToken>("/api/speech/token")
    .then((value) => {
      cachedToken = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
      return value;
    })
    .finally(() => {
      inFlightToken = null; // a failed request must not be latched; the next caller retries
    });
  return inFlightToken;
}

const escapeXml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Wraps examiner text in SSML. Standard neural voices get a slightly slower, examiner-like pace
 * and a short beat between sentences. HD voices (":DragonHD…") pace themselves and ignore
 * <prosody>/<break>, so they get the plain text. Voice comes from the ExaminerVoice setting. */
function toSsml(text: string, voice: string): string {
  const lang = voice.split("-").slice(0, 2).join("-");
  const escaped = escapeXml(text);
  const body = voice.includes(":DragonHD")
    ? escaped
    : // ponytail: naive sentence split — "Mr." gets a pause too; harmless at 300ms.
      `<prosody rate="-8%">${escaped.replace(/([.?!])\s+(?=\S)/g, '$1<break time="300ms"/> ')}</prosody>`;
  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${escapeXml(lang)}">` +
    `<voice name="${escapeXml(voice)}">${body}</voice></speak>`
  );
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

interface ListenOptions {
  /** Called once when the candidate has said something and then gone quiet for silenceMs. */
  onSilence?: () => void;
  silenceMs?: number;
}

interface UseSpeechResult {
  supported: boolean;
  speak: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  startListening: (opts?: ListenOptions) => Promise<void>;
  stopListening: () => Promise<{
    transcript: string;
    /** Raw lexical text with pause markers; "" when the recognizer returned no detailed JSON. */
    lexical: string;
    /** Speaking time of the turn, pauses included; 0 when no word timings came through. */
    durationSeconds: number;
    assessment: TurnAssessment | null;
  }>;
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
  // Raw recognition per segment, kept beside the display text rather than replacing it.
  const lexicalSegmentsRef = useRef<{ lexical: string; words: TimedWord[] }[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [supported] = useState(
    () => typeof navigator !== "undefined" && !!navigator.mediaDevices,
  );

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  };

  // Fetch the token up front so the examiner's greeting doesn't wait on it.
  useEffect(() => {
    if (supported) getSpeechToken().catch(() => {});
  }, [supported]);

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
          localSynthesizer.speakSsmlAsync(
            toSsml(text, voice),
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
        cachedToken = null; // a rejected token must not be reused on the retry
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

  const startListening = useCallback(async (opts?: ListenOptions) => {
    // ponytail: re-entrant start is a no-op — one recognizer per hook is all the
    // examiner-call UI needs, and it can't orphan a live mic.
    if (recognizerRef.current || startPromiseRef.current) return;

    setError(null);
    setInterimTranscript("");
    segmentsRef.current = [];
    segmentAssessmentsRef.current = [];
    lexicalSegmentsRef.current = [];
    clearSilenceTimer();

    // Armed only once speech is heard, so thinking time before the first word never ends the
    // turn; every recognizer event pushes it back. Fires at most once per listen.
    let silenceFired = false;
    const bumpSilenceTimer = () => {
      if (!opts?.onSilence || silenceFired) return;
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        silenceFired = true;
        opts.onSilence?.();
      }, opts.silenceMs ?? 3000);
    };

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
        // Committed segments + the open phrase. Showing only e.result.text made every
        // finalized sentence vanish from the caption, which reads as a wrong transcript even
        // though stopListening() still returns all of them joined.
        setInterimTranscript([...segmentsRef.current, e.result.text].join(" "));
        bumpSilenceTimer();
      };
      recognizer.recognized = (_sender, e) => {
        if (e.result.reason !== ResultReason.RecognizedSpeech) return;
        const text = e.result.text.trim();
        if (!text) return;
        bumpSilenceTimer();

        segmentsRef.current.push(text);
        // Same JSON the PA result is read from, taken directly because the SDK's DetailResult
        // typing exposes neither Lexical nor the per-word offsets. A malformed or absent payload
        // must never cost the candidate their turn, so this degrades to display text alone.
        try {
          const best = (JSON.parse(e.result.json) as DetailedPhrase).NBest?.[0];
          if (best)
            lexicalSegmentsRef.current.push({
              lexical: best.Lexical ?? "",
              words: best.Words ?? [],
            });
        } catch {
          // no detailed JSON for this segment; display text still stands
        }
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
        setInterimTranscript(segmentsRef.current.join(" "));
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
      cachedToken = null;
      setError(toMessage(e));
      throw e;
    } finally {
      startPromiseRef.current = null;
    }
  }, []);

  const stopListening = useCallback(async () => {
    clearSilenceTimer();
    // A stop issued during startup waits for the start to land, then stops it.
    if (startPromiseRef.current) {
      try {
        await startPromiseRef.current;
      } catch {
        // failed start already cleaned itself up; nothing to stop
      }
    }

    const recognizer = recognizerRef.current;
    if (!recognizer) return { transcript: "", lexical: "", durationSeconds: 0, assessment: null };
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
    // One pass over every word of the turn: absolute offsets mean the silences between
    // segments — the long ones Azure ends a phrase on — are measured the same way as the
    // hesitations inside one. Falls back to bare lexical text when no timings came through.
    const timedWords = lexicalSegmentsRef.current.flatMap((s) => s.words);
    const lexical = timedWords.length
      ? buildLexicalTranscript(timedWords)
      : lexicalSegmentsRef.current
          .map((s) => s.lexical)
          .join(" ")
          .trim();
    const assessment =
      segmentAssessmentsRef.current.length > 0
        ? aggregateAssessments(segmentAssessmentsRef.current)
        : null;
    return { transcript, lexical, durationSeconds: speakingSeconds(timedWords), assessment };
  }, []);

  // Dispose any live SDK objects (they hold the mic/speaker) if the component unmounts mid-turn.
  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
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

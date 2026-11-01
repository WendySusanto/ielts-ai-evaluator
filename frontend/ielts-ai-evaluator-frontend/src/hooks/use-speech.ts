import { buildLexicalTranscript, speakingSeconds, type TimedWord } from "@/lib/lexical";
import {
  aggregateAssessments,
  forgetSpeechToken,
  getSpeechToken,
  openMic,
  toSsml,
  type Mic,
  type RecordedAudio,
  type TurnAssessment,
} from "@/lib/speech";
import {
  AudioConfig,
  CancellationDetails,
  PronunciationAssessmentConfig,
  PronunciationAssessmentGradingSystem,
  PronunciationAssessmentGranularity,
  PronunciationAssessmentResult,
  PropertyId,
  ResultReason,
  SpeakerAudioDestination,
  SpeechConfig,
  SpeechRecognitionResult,
  SpeechRecognizer,
  SpeechSynthesizer,
} from "microsoft-cognitiveservices-speech-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

/** Azure's detailed recognition JSON, of which we want only the raw text and the word timings. */
interface DetailedPhrase {
  NBest?: { Lexical?: string; Words?: TimedWord[] }[];
}

/** One phrase Azure finalized during the turn. */
interface Segment {
  /** Display text: auto-punctuated, false starts tidied away. */
  text: string;
  /** Raw lexical text; "" when the detailed JSON didn't come through, words likewise empty. */
  lexical: string;
  words: TimedWord[];
  assessment: TurnAssessment | null;
}

/** Parses the raw JSON (SDK typings hide Lexical and offsets); a bad payload keeps the text alone. */
function toSegment(text: string, result: SpeechRecognitionResult): Segment {
  try {
    const best = (JSON.parse(result.json) as DetailedPhrase).NBest?.[0];
    const pa = PronunciationAssessmentResult.fromResult(result);
    return {
      text,
      lexical: best?.Lexical ?? "",
      words: best?.Words ?? [],
      assessment: {
        pronunciationScore: pa.pronunciationScore,
        accuracyScore: pa.accuracyScore,
        fluencyScore: pa.fluencyScore,
        prosodyScore: pa.prosodyScore,
        completenessScore: pa.completenessScore,
        words: pa.detailResult.Words.map((w) => ({
          word: w.Word,
          accuracyScore: w.PronunciationAssessment?.AccuracyScore ?? 0,
          errorType: w.PronunciationAssessment?.ErrorType ?? "None",
        })),
      },
    };
  } catch {
    return { text, lexical: "", words: [], assessment: null };
  }
}

function toMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// SDK close() throws on already-disposed objects, and disposal paths legitimately race.
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
    /** The answer's recording; null when the browser could not record. */
    audio: RecordedAudio | null;
  }>;
  /** Live mic loudness 0-1, measured per call: read it from an animation frame, not React state. */
  getMicLevel: () => number;
  interimTranscript: string;
  error: string | null;
}

/** Azure Speech: TTS for the examiner, STT + Pronunciation Assessment for the candidate. */
export function useSpeech(): UseSpeechResult {
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const synthesizerRef = useRef<SpeechSynthesizer | null>(null);
  const playerRef = useRef<SpeakerAudioDestination | null>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const micRef = useRef<Mic | null>(null); // committed alongside recognizerRef
  // In-flight startListening(); stopListening() awaits it so a fast start-then-stop can't leak one.
  const startPromiseRef = useRef<Promise<void> | null>(null);
  const disposedRef = useRef(false);
  const segmentsRef = useRef<Segment[]>([]);
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
    // pause() is the real stop (close() lets the buffer drain); it skips 'ended', so fire onAudioEnd by hand.
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
        // Unmounted while the token was in flight: nothing is left to hold a handle to the audio.
        if (disposedRef.current) return;
        const speechConfig = SpeechConfig.fromAuthorizationToken(token, region);
        speechConfig.speechSynthesisVoiceName = voice;

        player = new SpeakerAudioDestination();
        synthesizer = new SpeechSynthesizer(speechConfig, AudioConfig.fromSpeakerOutput(player));
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
              // onAudioEnd waits for close(), which the SDK never calls itself; the buffer still drains.
              localPlayer.close();
            },
            (err) => reject(new Error(err)),
          );
        });
      } catch (e) {
        forgetSpeechToken(); // a rejected token must not be reused on the retry
        setError(toMessage(e));
        throw e;
      } finally {
        // Dispose THIS call's objects; a newer speak() may already own the refs.
        safeClose(synthesizer);
        safeClose(player);
        if (synthesizerRef.current === synthesizer) synthesizerRef.current = null;
        if (playerRef.current === player) playerRef.current = null;
      }
    },
    [stopSpeaking],
  );

  const startListening = useCallback(async (opts?: ListenOptions) => {
    // ponytail: re-entrant start is a no-op; one recognizer per hook is all the UI needs.
    if (recognizerRef.current || startPromiseRef.current) return;

    setError(null);
    setInterimTranscript("");
    segmentsRef.current = [];
    clearSilenceTimer();

    // Armed by the first recognized word (thinking time never ends a turn), pushed back by any speech.
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
      // ponytail: Azure's 500ms split mid-clause phrases (misheard words); raise toward 2000 if it persists.
      speechConfig.setProperty(PropertyId.Speech_SegmentationSilenceTimeoutMs, "1200");

      const mic = await openMic(
        opts?.onSilence
          ? () => {
              if (silenceTimerRef.current) bumpSilenceTimer(); // extends an armed timer, never arms one
            }
          : undefined,
      );
      const recognizer = new SpeechRecognizer(speechConfig, AudioConfig.fromStreamInput(mic.stream));
      const paConfig = new PronunciationAssessmentConfig(
        "",
        PronunciationAssessmentGradingSystem.HundredMark,
        PronunciationAssessmentGranularity.Word,
      );
      paConfig.enableProsodyAssessment = true;
      paConfig.applyTo(recognizer);

      const committedText = () => segmentsRef.current.map((s) => s.text);
      recognizer.recognizing = (_sender, e) => {
        // Finalized segments plus the open phrase, so a finished sentence never drops off the caption.
        setInterimTranscript([...committedText(), e.result.text].join(" "));
        bumpSilenceTimer();
      };
      recognizer.recognized = (_sender, e) => {
        if (e.result.reason !== ResultReason.RecognizedSpeech) return;
        const text = e.result.text.trim();
        if (!text) return;
        bumpSilenceTimer();
        segmentsRef.current.push(toSegment(text, e.result));
        setInterimTranscript(committedText().join(" "));
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
        mic.release();
        throw e;
      }

      // Commit only once live, so stopListening sees either null or a started recognizer.
      if (disposedRef.current) {
        // component unmounted mid-start: release the mic instead of committing
        recognizer.stopContinuousRecognitionAsync(
          () => safeClose(recognizer),
          () => safeClose(recognizer),
        );
        mic.release();
        return;
      }
      recognizerRef.current = recognizer;
      micRef.current = mic;
      mic.startRecording(); // from the moment the recognizer is live, like the transcript
    })();

    startPromiseRef.current = startPromise;
    try {
      await startPromise;
    } catch (e) {
      forgetSpeechToken();
      setError(toMessage(e));
      throw e;
    } finally {
      startPromiseRef.current = null;
    }
  }, []);

  const stopListening = useCallback(async () => {
    clearSilenceTimer();
    // A stop during startup waits for the start to land; a failed start cleaned up after itself.
    await startPromiseRef.current?.catch(() => {});

    const recognizer = recognizerRef.current;
    const mic = micRef.current;
    if (!recognizer)
      return { transcript: "", lexical: "", durationSeconds: 0, assessment: null, audio: null };
    // Claim both so a concurrent stop can't double-dispose, nor a new start's mic be released here.
    recognizerRef.current = null;
    micRef.current = null;

    await new Promise<void>((resolve, reject) => {
      recognizer.stopContinuousRecognitionAsync(resolve, (err) => reject(new Error(err)));
    }).catch((e) => setError(toMessage(e)));
    safeClose(recognizer);
    // After the recognizer flushes, before the tracks stop: stopping a track loses the last chunk.
    const audio = (await mic?.stopRecording()) ?? null;
    mic?.release();
    setInterimTranscript("");

    const segments = segmentsRef.current;
    // Absolute offsets, so pauses between segments count like pauses inside one; bare text if untimed.
    const timedWords = segments.flatMap((s) => s.words);
    const lexical = timedWords.length
      ? buildLexicalTranscript(timedWords)
      : segments.map((s) => s.lexical).filter(Boolean).join(" ");
    const assessments = segments.flatMap((s) => s.assessment ?? []);
    return {
      transcript: segments.map((s) => s.text).join(" "),
      lexical,
      durationSeconds: speakingSeconds(timedWords),
      assessment: assessments.length > 0 ? aggregateAssessments(assessments) : null,
      audio,
    };
  }, []);

  const getMicLevel = useCallback(() => micRef.current?.level() ?? 0, []);

  // Dispose any live SDK objects (they hold the mic/speaker) if the component unmounts mid-turn.
  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      safeClose(recognizerRef.current);
      micRef.current?.release();
      stopSpeaking(); // pauses playback; a bare close() would let it finish the sentence
    };
  }, [stopSpeaking]);

  return {
    supported,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    getMicLevel,
    interimTranscript,
    error,
  };
}

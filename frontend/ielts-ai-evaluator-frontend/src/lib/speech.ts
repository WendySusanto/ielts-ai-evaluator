// Speaking-session helpers that need neither React nor the Azure SDK.
import { api } from "@/lib/api";
import type { PronunciationResult, SpeechToken } from "@/types/Speaking";

// Azure STS tokens expire after 10 min; refresh a couple of minutes early.
const TOKEN_TTL_MS = 8 * 60 * 1000;
const MAX_WORDS = 400;

let cachedToken: { value: SpeechToken; expiresAt: number } | null = null;
// Shared by concurrent callers, so they spend one request of the 30/hour cap instead of one each.
let inFlightToken: Promise<SpeechToken> | null = null;

export function getSpeechToken(): Promise<SpeechToken> {
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

/** Drops the cached token, so a rejected one is not reused on the retry. */
export function forgetSpeechToken(): void {
  cachedToken = null;
}

const escapeXml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Examiner SSML: slower pace and sentence breaks, except HD voices, which ignore <prosody>/<break>. */
export function toSsml(text: string, voice: string): string {
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

/** Per-turn pronunciation assessment: PronunciationResult minus the server-computed fields. */
export type TurnAssessment = Omit<PronunciationResult, "band" | "wordsPerMinute">;

/** Word-count-weighted PA scores plus the words (capped at MAX_WORDS), across segments or turns. */
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

// ponytail: fixed RMS line between speech (~0.03-0.1) and a quiet room (<0.005); adaptive if rooms are loud.
const VOICE_RMS = 0.01;

/** RMS as a 0-1 meter reading on a dB scale: -50 dBFS (quiet room) is 0, -15 dBFS (close speech) is 1. */
const toMeterLevel = (rms: number) =>
  Math.min(1, Math.max(0, (20 * Math.log10(rms) + 50) / 35));

/** One answer's recording: the audio as the browser encoded it, and how long it ran. */
export type RecordedAudio = { blob: Blob; seconds: number };

// Formats Gemini reads, best first: webm (Chrome/Edge), ogg (Firefox), mp4 (Safari — ponytail: untested).
const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];

/** The first type this browser can record, or null: the answer is then scored from text alone. */
function pickRecordingType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** The turn's mic: one stream feeds the recognizer, meter, voice check and recording. */
export type Mic = {
  stream: MediaStream;
  level: () => number;
  startRecording: () => void;
  stopRecording: () => Promise<RecordedAudio | null>;
  /** Stops the stream; the SDK never stops a stream it was handed. */
  release: () => void;
};

/** onVoice fires every 100ms the mic hears speech; recognizer events lag pauses and miss "eee…". */
export async function openMic(onVoice?: () => void): Promise<Mic> {
  // Same constraints as the SDK's own default mic, so recognition hears what it always did.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const context = new AudioContext();
  const analyser = context.createAnalyser();
  context.createMediaStreamSource(stream).connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  const rms = () => {
    analyser.getFloatTimeDomainData(samples);
    return Math.sqrt(samples.reduce((sum, s) => sum + s * s, 0) / samples.length);
  };
  const poll = onVoice
    ? setInterval(() => {
        if (rms() > VOICE_RMS) onVoice();
      }, 100)
    : undefined;

  // 32 kbps: Gemini works from 16 kbps audio anyway, and five minutes stays near 1.2 MB.
  const recordingType = pickRecordingType();
  const recorder = recordingType
    ? new MediaRecorder(stream, { mimeType: recordingType, audioBitsPerSecond: 32_000 })
    : null;
  const chunks: Blob[] = [];
  if (recorder)
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
  let recordingStartedAt = 0;

  return {
    stream,
    level: () => toMeterLevel(rms()),
    startRecording: () => {
      recorder?.start();
      recordingStartedAt = Date.now();
    },
    stopRecording: () =>
      new Promise((resolve) => {
        const finish = () =>
          resolve(
            recorder && chunks.length > 0
              ? {
                  blob: new Blob(chunks, { type: recorder.mimeType }),
                  seconds: (Date.now() - recordingStartedAt) / 1000,
                }
              : null,
          );
        if (!recorder || recorder.state === "inactive") return finish();
        recorder.onstop = finish;
        recorder.stop();
      }),
    release: () => {
      clearInterval(poll);
      context.close().catch(() => {});
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

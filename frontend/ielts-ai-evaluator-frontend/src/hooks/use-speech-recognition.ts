import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API which isn't in the standard lib DOM types.
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface UseSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
  setTranscript: (value: string) => void;
}

/**
 * Wraps the browser Web Speech API for continuous dictation.
 * Falls back gracefully (isSupported = false) on browsers without support,
 * letting the UI offer a manual transcript text area instead.
 */
export function useSpeechRecognition(
  lang = "en-US",
): UseSpeechRecognitionResult {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const Ctor = getRecognitionConstructor();
  const isSupported = Ctor !== null;

  useEffect(() => {
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalChunk += text + " ";
        } else {
          interimChunk += text;
        }
      }
      if (finalChunk) {
        setTranscript((prev) =>
          (prev + " " + finalChunk).replace(/\s+/g, " ").trimStart(),
        );
      }
      setInterimTranscript(interimChunk);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      setError(event.error);
    };

    recognition.onend = () => {
      // Chrome stops periodically; restart while the user is still recording.
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch {
          // ignore: start can throw if called too quickly
        }
      } else {
        setIsListening(false);
        setInterimTranscript("");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } catch {
        // ignore
      }
    };
  }, [Ctor, lang]);

  const start = useCallback(() => {
    setError(null);
    shouldKeepListeningRef.current = true;
    try {
      recognitionRef.current?.start();
      setIsListening(true);
    } catch {
      // Calling start twice throws; ignore.
    }
  }, []);

  const stop = useCallback(() => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
    setTranscript,
  };
}

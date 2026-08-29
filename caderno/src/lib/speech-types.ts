// Tipagem mínima do Web Speech API — não faz parte do lib.dom padrão do TS.
// Compartilhada entre o botão de microfone do Aristides e a escuta contínua
// da palavra de ativação (src/lib/wakeword.ts).

export interface SpeechRecognitionResultAlternativeLike {
  transcript: string;
}

export interface SpeechRecognitionResultItemLike {
  length: number;
  [j: number]: SpeechRecognitionResultAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  length: number;
  [i: number]: SpeechRecognitionResultItemLike;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
}

export interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export type SRWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };

export function pegarConstrutorSR(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as SRWindow;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

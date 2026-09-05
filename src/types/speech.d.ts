// Minimal ambient typings for the Web Speech API (SpeechRecognition).

interface SpeechRecognitionEventResultItem {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionAlternative {
  [index: number]: SpeechRecognitionEventResultItem;
  length: number;
  item(index: number): SpeechRecognitionEventResultItem;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionEventResultItem;
  length: number;
  item(index: number): SpeechRecognitionEventResultItem;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
  item(index: number): SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null;
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionStatic;
  webkitSpeechRecognition?: SpeechRecognitionStatic;
}

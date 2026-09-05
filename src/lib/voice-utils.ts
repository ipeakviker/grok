"use client";
export const OPENAI_KEY_STORAGE = "jarvis-openai-key";
export const TTS_VOICE_STORAGE = "jarvis-tts-voice";
export type OpenAiTtsVoice = "nova" | "onyx";
export function getOpenAiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const k = localStorage.getItem(OPENAI_KEY_STORAGE)?.trim();
    return k || null;
  } catch {
    return null;
  }
}
export function setOpenAiKey(key: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!key?.trim()) localStorage.removeItem(OPENAI_KEY_STORAGE);
    else localStorage.setItem(OPENAI_KEY_STORAGE, key.trim());
  } catch {}
}
export function getTtsVoice(): OpenAiTtsVoice {
  if (typeof window === "undefined") return "nova";
  try {
    const v = localStorage.getItem(TTS_VOICE_STORAGE);
    return v === "onyx" ? "onyx" : "nova";
  } catch {
    return "nova";
  }
}
export function setTtsVoice(voice: OpenAiTtsVoice) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TTS_VOICE_STORAGE, voice);
  } catch {}
}
let currentAudio: HTMLAudioElement | null = null;
export function stopSpeaking() {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
}
function pickBestRussianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const ru = voices.filter((v) => v.lang?.toLowerCase().startsWith("ru"));
  if (!ru.length) return null;
  const prefer = [/google/i, /microsoft/i, /yandex/i, /irina/i, /milena/i, /natalia/i];
  for (const re of prefer) {
    const hit = ru.find((v) => re.test(v.name));
    if (hit) return hit;
  }
  return ru[0];
}
export function speakBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ru-RU";
  utter.rate = 0.98;
  utter.pitch = 0.92;
  utter.volume = 1;
  const ruVoice = pickBestRussianVoice();
  if (ruVoice) utter.voice = ruVoice;
  window.speechSynthesis.speak(utter);
}
export async function speakOpenAi(text: string, apiKey: string, voice: OpenAiTtsVoice = "nova"): Promise<void> {
  stopSpeaking();
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice,
      input: text.slice(0, 4096),
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("OpenAI TTS " + res.status + ": " + errText.slice(0, 200));
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  await new Promise((resolve, reject) => {
    const audio = new Audio(url);
    currentAudio = audio;
    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      reject(new Error("Audio playback failed"));
    };
    void audio.play().catch(reject);
  });
}
export async function speak(text: string): Promise<void> {
  const key = getOpenAiKey();
  if (key) {
    try {
      await speakOpenAi(text, key, getTtsVoice());
      return;
    } catch (err) {
      console.warn("OpenAI TTS failed, falling back to Web Speech", err);
    }
  }
  speakBrowser(text);
}
export async function transcribeWhisper(apiKey: string, maxMs = 12000): Promise<string> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";
  const chunks = [];
  const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const done = new Promise((resolve, reject) => {
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onerror = () => reject(new Error("MediaRecorder error"));
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
    };
  });
  recorder.start(250);
  await new Promise((r) => setTimeout(r, maxMs));
  if (recorder.state !== "inactive") recorder.stop();
  const blob = await done;
  const form = new FormData();
  form.append("file", blob, "speech.webm");
  form.append("model", "whisper-1");
  form.append("language", "ru");
  form.append("response_format", "json");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey },
    body: form,
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error("Whisper " + res.status + ": " + errText.slice(0, 200));
  }
  const data = await res.json();
  return (data.text || "").trim();
}
export function createWhisperSession(apiKey: string) {
  let aborted = false;
  let recorder = null;
  let stream = null;
  const chunks = [];
  let resolveBlob = null;
  let rejectBlob = null;
  const blobPromise = new Promise((resolve, reject) => {
    resolveBlob = resolve;
    rejectBlob = reject;
  });
  void (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (aborted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onerror = () => rejectBlob(new Error("MediaRecorder error"));
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolveBlob(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.start(250);
    } catch (e) {
      rejectBlob(e instanceof Error ? e : new Error(String(e)));
    }
  })();
  return {
    abort() {
      aborted = true;
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch {}
      if (stream) stream.getTracks().forEach((t) => t.stop());
      rejectBlob(new Error("aborted"));
    },
    async stop() {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      else if (!recorder) {
        await new Promise((r) => setTimeout(r, 400));
        if (recorder && recorder.state !== "inactive") recorder.stop();
      }
      const blob = await blobPromise;
      if (aborted) throw new Error("aborted");
      const form = new FormData();
      form.append("file", blob, "speech.webm");
      form.append("model", "whisper-1");
      form.append("language", "ru");
      form.append("response_format", "json");
      const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: "Bearer " + apiKey },
        body: form,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error("Whisper " + res.status + ": " + errText.slice(0, 200));
      }
      const data = await res.json();
      return (data.text || "").trim();
    },
  };
}
export function matchBotVoiceCommand(text, setBotsRunning) {
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  const start =
    /^(запусти|запустить|старт|включи|включить|start)\s+(всех\s+)?(бота|ботов|бот|bots?)(\s+(.+))?$/.exec(t) ||
    /^(запусти|старт|включи)\s+(grid|mean|momentum|alpha|beta|gamma|btc|eth|sol)/.exec(t);
  const stop =
    /^(останови|остановить|стоп|выключи|выключить|stop)\s+(всех\s+)?(бота|ботов|бот|bots?)(\s+(.+))?$/.exec(t) ||
    /^(останови|стоп|выключи)\s+(grid|mean|momentum|alpha|beta|gamma|btc|eth|sol)/.exec(t);
  if (start) {
    const match = (start[5] || start[2] || "").trim() || undefined;
    const all = /всех/.test(t) || !match;
    return setBotsRunning(true, all ? undefined : match);
  }
  if (stop) {
    const match = (stop[5] || stop[2] || "").trim() || undefined;
    const all = /всех/.test(t) || !match;
    return setBotsRunning(false, all ? undefined : match);
  }
  return null;
}

"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createJarvisEngine, getEngineVersion, type JarvisEngineHandle } from "@/lib/jarvis-engine";
import { matchDashboardIntent } from "@/lib/dashboard-context";
import { loadChat, saveChat } from "@/lib/terminal-store";
import { useTerminalSim } from "@/lib/use-terminal-sim";
import {
  createWhisperSession,
  getOpenAiKey,
  matchBotVoiceCommand,
  speak,
  stopSpeaking,
} from "@/lib/voice-utils";
import type { ChatMessage } from "@/components/CommandChatPanel";
type EngineStatus = "loading" | "ready" | "error";
type OrbState = "idle" | "listening" | "thinking" | "speaking";
export type PanelId = "chat" | "terminal" | "bots" | "agents" | "rustaman";
export function useCommandCenter(initialMessages: ChatMessage[]) {
  const [expanded, setExpanded] = useState<PanelId | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>(initialMessages);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("loading");
  const [engineVersion, setEngineVersion] = useState<string>("");
  const [orb, setOrb] = useState<OrbState>("idle");
  const [mood, setMood] = useState<string>("neutral");
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [hasOpenAiKey, setHasOpenAiKey] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [holdMode, setHoldMode] = useState(false);
  const engineRef = useRef<JarvisEngineHandle | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const whisperSessionRef = useRef<ReturnType<typeof createWhisperSession> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<(text: string) => Promise<void>>(async () => {});
  const restartTimerRef = useRef<number | null>(null);
  const terminal = useTerminalSim();
  const terminalRef = useRef(terminal);
  terminalRef.current = terminal;
  useEffect(() => {
    const saved = loadChat() as ChatMessage[];
    if (saved.length) setChat(saved);
    setHydrated(true);
    setHasOpenAiKey(!!getOpenAiKey());
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    saveChat(chat);
  }, [chat, hydrated]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [engine, version] = await Promise.all([createJarvisEngine(), getEngineVersion()]);
        if (cancelled) return;
        engineRef.current = engine;
        setEngineVersion(version);
        setEngineStatus("ready");
      } catch (err) {
        console.error("Failed to load jarvis-core wasm engine", err);
        if (!cancelled) setEngineStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const replyWithTts = useCallback(
    async (content: string, intent?: string, moodVal?: string) => {
      if (moodVal) setMood(moodVal);
      setChat((prev) => [...prev, { role: "jarvis", content, intent, mood: moodVal }]);
      if (ttsEnabled) {
        setOrb("speaking");
        try {
          await speak(content);
        } catch (err) {
          console.warn("speak failed", err);
        }
        setOrb(listeningRef.current ? "listening" : "idle");
      } else {
        setOrb(listeningRef.current ? "listening" : "idle");
      }
    },
    [ttsEnabled],
  );
  const handleUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setBusy(true);
      setOrb("thinking");
      setInterimTranscript("");
      setChat((prev) => [...prev, { role: "user", content: trimmed }]);
      try {
        const term = terminalRef.current;
        const botReply = matchBotVoiceCommand(trimmed, term.setBotsRunning);
        if (botReply) {
          await replyWithTts(botReply, "bots", "proud");
          return;
        }
        const dash = matchDashboardIntent(trimmed, term.state, {
          engineVersion,
          btc: term.btc,
          eth: term.eth,
        });
        if (dash) {
          await replyWithTts(dash.reply, dash.intent, dash.mood);
          return;
        }
        let engine = engineRef.current;
        if (!engine) {
          engine = await createJarvisEngine();
          engineRef.current = engine;
          setEngineStatus("ready");
        }
        const ctx = term.state
          ? `[ctx equity $${term.state.totalValue.toFixed(0)} uPnL ${term.state.unrealized.toFixed(1)} bots ${term.state.bots.filter((b) => b.running).length}] `
          : "";
        const result = engine.process(ctx + trimmed);
        await replyWithTts(result.reply, result.intent, result.mood);
      } catch (err) {
        console.error("Engine processing failed", err);
        setChat((prev) => [
          ...prev,
          { role: "jarvis", content: "Похоже, Rust-ядро ещё не загрузилось. Попробуйте ещё раз через секунду." },
        ]);
        setOrb("idle");
      } finally {
        setBusy(false);
      }
    },
    [busy, engineVersion, replyWithTts],
  );
  handleRef.current = handleUserMessage;
  useEffect(() => {
    const w = window as unknown as Window;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceSupported(typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia);
      return;
    }
    setVoiceSupported(true);
    const recognition = new Ctor();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      let interim = "";
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const piece = res?.[0]?.transcript || "";
        const isFinal = (res as unknown as { isFinal?: boolean }).isFinal;
        if (isFinal) finalText += piece;
        else interim += piece;
      }
      if (interim) setInterimTranscript(interim);
      if (finalText.trim()) {
        setInterimTranscript("");
        void handleRef.current(finalText.trim());
      }
    };
    recognition.onerror = (ev) => {
      if (ev.error === "aborted" || ev.error === "no-speech") return;
      console.warn("SpeechRecognition error", ev.error);
      if (!listeningRef.current) setListening(false);
    };
    recognition.onend = () => {
      if (listeningRef.current && !getOpenAiKey()) {
        if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => {
          if (!listeningRef.current) return;
          try {
            recognition.start();
            setOrb("listening");
          } catch {}
        }, 280);
      } else if (!listeningRef.current) {
        setListening(false);
        setOrb((o) => (o === "listening" ? "idle" : o));
      }
    };
    recognitionRef.current = recognition;
    return () => {
      listeningRef.current = false;
      if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
      try {
        recognition.abort();
      } catch {}
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExpanded(null);
        setVoiceSettingsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const stopListening = useCallback(async () => {
    listeningRef.current = false;
    setListening(false);
    setInterimTranscript("");
    const whisper = whisperSessionRef.current;
    whisperSessionRef.current = null;
    if (whisper) {
      setOrb("thinking");
      try {
        const text = await whisper.stop();
        if (text) await handleRef.current(text);
        else setOrb("idle");
      } catch (err) {
        if (!(err instanceof Error && err.message === "aborted")) {
          console.error("Whisper stop failed", err);
          setChat((prev) => [
            ...prev,
            {
              role: "jarvis",
              content: `Whisper не смог расшифровать: ${err instanceof Error ? err.message : String(err)}. Проверьте ключ в Settings · Voice.`,
            },
          ]);
        }
        setOrb("idle");
      }
      return;
    }
    const recognition = recognitionRef.current;
    try {
      recognition?.stop();
    } catch {}
    setOrb("idle");
  }, []);
  const startListening = useCallback(async () => {
    stopSpeaking();
    const key = getOpenAiKey();
    setHasOpenAiKey(!!key);
    listeningRef.current = true;
    setListening(true);
    setOrb("listening");
    setInterimTranscript(key ? "Whisper: запись…" : "");
    if (key) {
      try {
        whisperSessionRef.current = createWhisperSession(key);
      } catch (err) {
        console.error(err);
        listeningRef.current = false;
        setListening(false);
        setOrb("idle");
        setChat((prev) => [
          ...prev,
          { role: "jarvis", content: "Не удалось получить доступ к микрофону для Whisper." },
        ]);
      }
      return;
    }
    const recognition = recognitionRef.current;
    if (!recognition) {
      listeningRef.current = false;
      setListening(false);
      setOrb("idle");
      return;
    }
    try {
      recognition.start();
    } catch (err) {
      console.error("Could not start recognition", err);
      try {
        recognition.abort();
        window.setTimeout(() => {
          try {
            recognition.start();
          } catch (e2) {
            console.error(e2);
            listeningRef.current = false;
            setListening(false);
            setOrb("idle");
          }
        }, 200);
      } catch {
        listeningRef.current = false;
        setListening(false);
        setOrb("idle");
      }
    }
  }, []);
  const toggleListening = useCallback(() => {
    if (listening) void stopListening();
    else void startListening();
  }, [listening, startListening, stopListening]);
  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const text = input;
      setInput("");
      void handleUserMessage(text);
    },
    [handleUserMessage, input],
  );
  const clearHistory = useCallback(() => {
    setChat([]);
    engineRef.current?.reset();
    saveChat([]);
  }, []);
  const orbClasses = useMemo(() => {
    const size = expanded === "chat" ? "h-36 w-36 sm:h-44 sm:w-44" : "h-20 w-20 sm:h-24 sm:w-24";
    const base = `relative ${size} rounded-full transition-all duration-500 ease-out shadow-[0_0_80px_rgba(56,189,248,0.35)]`;
    switch (orb) {
      case "listening":
        return `${base} bg-gradient-to-br from-rose-400 via-rose-500 to-orange-500 animate-jarvis-pulse-fast`;
      case "thinking":
        return `${base} bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 animate-jarvis-spin`;
      case "speaking":
        return `${base} bg-gradient-to-br from-cyan-300 via-sky-500 to-blue-600 animate-jarvis-pulse-fast`;
      default:
        return `${base} bg-gradient-to-br from-cyan-400 via-sky-600 to-indigo-700 animate-jarvis-pulse`;
    }
  }, [orb, expanded]);
  const statusLabel =
    engineStatus === "loading"
      ? "Загрузка Rust-ядра…"
      : engineStatus === "error"
        ? "Ошибка WASM"
        : `${engineVersion || "jarvis"} · онлайн`;
  const voiceHint = listening
    ? interimTranscript
      ? interimTranscript
      : hasOpenAiKey
        ? "Whisper · говорите, затем «Стоп»"
        : "Слушаю… interim transcript"
    : hasOpenAiKey
      ? "Whisper STT + OpenAI TTS · ключ в браузере"
      : voiceSupported
        ? "Голос: Web Speech · «что на экране» / «запусти бота» · Settings для Whisper"
        : "Микрофон/Speech недоступны — текстовый ввод";
  return {
    expanded,
    setExpanded,
    chat,
    input,
    setInput,
    engineStatus,
    engineVersion,
    orb,
    mood,
    listening,
    voiceSupported,
    ttsEnabled,
    setTtsEnabled,
    terminal,
    scrollRef,
    toggleListening,
    startListening,
    stopListening,
    onSubmit,
    clearHistory,
    orbClasses,
    statusLabel,
    anyExpanded: expanded !== null,
    interimTranscript,
    voiceHint,
    hasOpenAiKey,
    setHasOpenAiKey,
    voiceSettingsOpen,
    setVoiceSettingsOpen,
    holdMode,
    setHoldMode,
  };
}

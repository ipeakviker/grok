"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createJarvisEngine, getEngineVersion, type JarvisEngineHandle } from "@/lib/jarvis-engine";
import { loadChat, saveChat } from "@/lib/terminal-store";
import { useTerminalSim } from "@/lib/use-terminal-sim";
import { matchBotVoiceCommand, speak } from "@/lib/voice-utils";
import type { ChatMessage } from "@/components/CommandChatPanel";

type EngineStatus = "loading" | "ready" | "error";
type OrbState = "idle" | "listening" | "thinking" | "speaking";
export type PanelId = "chat" | "terminal" | "bots" | "agents";

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

  const engineRef = useRef<JarvisEngineHandle | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<(text: string) => Promise<void>>(async () => {});

  const terminal = useTerminalSim();

  useEffect(() => {
    const saved = loadChat() as ChatMessage[];
    if (saved.length) setChat(saved);
    setHydrated(true);
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

  const handleUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setBusy(true);
      setOrb("thinking");
      setChat((prev) => [...prev, { role: "user", content: trimmed }]);

      try {
        const botReply = matchBotVoiceCommand(trimmed, terminal.setBotsRunning);
        if (botReply) {
          setMood("proud");
          setChat((prev) => [...prev, { role: "jarvis", content: botReply, intent: "bots", mood: "proud" }]);
          if (ttsEnabled) {
            setOrb("speaking");
            speak(botReply);
            window.setTimeout(() => setOrb("idle"), 1800);
          } else setOrb("idle");
          return;
        }

        let engine = engineRef.current;
        if (!engine) {
          engine = await createJarvisEngine();
          engineRef.current = engine;
          setEngineStatus("ready");
        }
        const result = engine.process(trimmed);
        setMood(result.mood);
        setChat((prev) => [
          ...prev,
          { role: "jarvis", content: result.reply, intent: result.intent, mood: result.mood },
        ]);
        if (ttsEnabled) {
          setOrb("speaking");
          speak(result.reply);
          window.setTimeout(() => setOrb("idle"), Math.min(6000, Math.max(1200, result.reply.length * 55)));
        } else setOrb("idle");
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
    [busy, ttsEnabled, terminal.setBotsRunning],
  );

  handleRef.current = handleUserMessage;

  useEffect(() => {
    const w = window as unknown as Window;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setVoiceSupported(false);
      return;
    }
    setVoiceSupported(true);
    const recognition = new Ctor();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript?.trim();
      if (transcript) void handleRef.current(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    return () => {
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
      if (e.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
      setOrb("idle");
    } else {
      try {
        recognition.start();
        setListening(true);
        setOrb("listening");
      } catch (err) {
        console.error("Could not start recognition", err);
      }
    }
  }, [listening]);

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

  return {
    expanded,
    setExpanded,
    chat,
    input,
    setInput,
    engineStatus,
    orb,
    mood,
    listening,
    voiceSupported,
    ttsEnabled,
    setTtsEnabled,
    terminal,
    scrollRef,
    toggleListening,
    onSubmit,
    clearHistory,
    orbClasses,
    statusLabel,
    anyExpanded: expanded !== null,
  };
}

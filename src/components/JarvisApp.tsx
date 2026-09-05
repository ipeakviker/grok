"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createJarvisEngine, getEngineVersion, type JarvisEngineHandle } from "@/lib/jarvis-engine";

type Role = "user" | "jarvis";

export interface ChatMessage {
  id?: number;
  role: Role;
  content: string;
  intent?: string | null;
  mood?: string | null;
  createdAt?: string;
}

type EngineStatus = "loading" | "ready" | "error";
type OrbState = "idle" | "listening" | "thinking" | "speaking";

const MOOD_LABEL: Record<string, string> = {
  neutral: "Спокоен",
  happy: "Доволен",
  funny: "Шутит",
  proud: "Гордится",
  confused: "Задумался",
};

function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ru-RU";
  utter.rate = 1.02;
  utter.pitch = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const ruVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("ru"));
  if (ruVoice) utter.voice = ruVoice;
  window.speechSynthesis.speak(utter);
}

export default function JarvisApp({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const [chat, setChat] = useState<ChatMessage[]>(initialMessages);
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
      if (transcript) {
        void handleUserMessage(transcript);
      }
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const persist = useCallback(async (msg: ChatMessage) => {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
      const data = (await res.json()) as { ok: boolean; message?: { id: number; createdAt: string } };
      return data.message;
    } catch (err) {
      console.error("Failed to persist message", err);
      return undefined;
    }
  }, []);

  const handleUserMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      setBusy(true);
      setOrb("thinking");

      const userMsg: ChatMessage = { role: "user", content: trimmed };
      setChat((prev) => [...prev, userMsg]);
      void persist(userMsg);

      try {
        let engine = engineRef.current;
        if (!engine) {
          engine = await createJarvisEngine();
          engineRef.current = engine;
          setEngineStatus("ready");
        }
        const result = engine.process(trimmed);
        const jarvisMsg: ChatMessage = {
          role: "jarvis",
          content: result.reply,
          intent: result.intent,
          mood: result.mood,
        };
        setMood(result.mood);
        setChat((prev) => [...prev, jarvisMsg]);
        void persist(jarvisMsg);

        if (ttsEnabled) {
          setOrb("speaking");
          speak(result.reply);
          const estMs = Math.min(6000, Math.max(1200, result.reply.length * 55));
          window.setTimeout(() => setOrb("idle"), estMs);
        } else {
          setOrb("idle");
        }
      } catch (err) {
        console.error("Engine processing failed", err);
        const errorMsg: ChatMessage = {
          role: "jarvis",
          content: "Похоже, Rust-ядро ещё не загрузилось. Попробуйте ещё раз через секунду.",
        };
        setChat((prev) => [...prev, errorMsg]);
        setOrb("idle");
      } finally {
        setBusy(false);
      }
    },
    [busy, persist, ttsEnabled],
  );

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

  const clearHistory = useCallback(async () => {
    setChat([]);
    engineRef.current?.reset();
    try {
      await fetch("/api/messages", { method: "DELETE" });
    } catch (err) {
      console.error("Failed to clear history", err);
    }
  }, []);

  const orbClasses = useMemo(() => {
    const base =
      "relative h-40 w-40 sm:h-52 sm:w-52 rounded-full transition-all duration-500 ease-out shadow-[0_0_80px_rgba(56,189,248,0.35)]";
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
  }, [orb]);

  const statusLabel =
    engineStatus === "loading"
      ? "Загрузка Rust-ядра…"
      : engineStatus === "error"
        ? "Ошибка загрузки WASM-ядра"
        : `${engineVersion} · онлайн`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#0b1220,_#020409_65%)] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8 sm:px-8">
        <header className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-400/80">Rust · WebAssembly · Next.js</p>
          <h1 className="bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            J.A.R.V.I.S.
          </h1>
          <p
            className={`mt-1 text-xs font-medium ${
              engineStatus === "error" ? "text-rose-400" : "text-slate-400"
            }`}
          >
            {statusLabel}
          </p>
        </header>

        <div className="mt-6 flex flex-col items-center gap-4">
          <div className={orbClasses}>
            <div className="absolute inset-4 rounded-full bg-slate-950/60 backdrop-blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] uppercase tracking-widest text-cyan-100/80">
              {orb === "idle" && "ожидание"}
              {orb === "listening" && "слушаю"}
              {orb === "thinking" && "думаю"}
              {orb === "speaking" && "говорю"}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={toggleListening}
              disabled={!voiceSupported || engineStatus !== "ready"}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
                listening
                  ? "bg-rose-500 text-white hover:bg-rose-400"
                  : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
              }`}
            >
              {listening ? "⏹ Остановить" : "🎙️ Говорить"}
            </button>
            <button
              type="button"
              onClick={() => setTtsEnabled((v) => !v)}
              className={`rounded-full border px-4 py-2.5 text-sm font-medium transition ${
                ttsEnabled
                  ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                  : "border-slate-700 bg-slate-900/60 text-slate-400"
              }`}
            >
              {ttsEnabled ? "🔊 Озвучка включена" : "🔇 Озвучка выключена"}
            </button>
            <button
              type="button"
              onClick={clearHistory}
              className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-rose-500/60 hover:text-rose-300"
            >
              🗑️ Очистить историю
            </button>
          </div>
          {!voiceSupported && (
            <p className="max-w-md text-center text-xs text-slate-500">
              Голосовой ввод (Web Speech API) не поддерживается этим браузером — используйте текстовое поле ниже. Попробуйте Chrome/Edge.
            </p>
          )}
        </div>

        <section
          ref={scrollRef}
          className="mt-8 flex-1 space-y-3 overflow-y-auto rounded-3xl border border-slate-800/80 bg-slate-950/50 p-4 shadow-inner sm:p-6"
          style={{ maxHeight: "48vh" }}
        >
          {chat.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              Скажите «привет», спросите «который час» или «посчитай 12*7» — Джарвис ответит.
            </p>
          )}
          {chat.map((m, idx) => (
            <div key={m.id ?? idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md sm:max-w-[70%] ${
                  m.role === "user"
                    ? "bg-cyan-600 text-white"
                    : "border border-slate-700/80 bg-slate-900/80 text-slate-100"
                }`}
              >
                {m.role === "jarvis" && (
                  <p className="mb-1 text-[0.65rem] uppercase tracking-widest text-cyan-400/70">
                    Jarvis{m.mood ? ` · ${MOOD_LABEL[m.mood] ?? m.mood}` : ""}
                  </p>
                )}
                {m.content}
              </div>
            </div>
          ))}
        </section>

        <form onSubmit={onSubmit} className="mt-4 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите что-нибудь у Джарвиса…"
            className="flex-1 rounded-full border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={engineStatus !== "ready" || !input.trim()}
            className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Отправить
          </button>
        </form>

        <footer className="mt-6 pb-2 text-center text-[0.7rem] text-slate-600">
          Логика распознавания намерений, калькулятор и память заметок выполняются в Rust, скомпилированном в WebAssembly. {" "}
          Голос и интерфейс — Next.js + Web Speech API. Текущее настроение: {MOOD_LABEL[mood] ?? mood}.
        </footer>
      </div>
    </main>
  );
}

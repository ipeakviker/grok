"use client";

import type { FormEvent, RefObject } from "react";

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

const MOOD_LABEL: Record<string, string> = {
  neutral: "Спокоен",
  happy: "Доволен",
  funny: "Шутит",
  proud: "Гордится",
  confused: "Задумался",
};

type Props = {
  chat: ChatMessage[];
  mood: string;
  orbClasses: string;
  orb: string;
  input: string;
  setInput: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  engineStatus: EngineStatus;
  clearHistory: () => void;
  scrollRef: RefObject<HTMLDivElement | null>;
};

export default function CommandChatPanel({
  chat,
  mood,
  orbClasses,
  orb,
  input,
  setInput,
  onSubmit,
  engineStatus,
  clearHistory,
  scrollRef,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="flex flex-col items-center gap-2">
        <div className={orbClasses}>
          <div className="absolute inset-[18%] rounded-full bg-slate-950/60 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center text-[0.55rem] uppercase tracking-widest text-cyan-100/80">
            {orb === "idle" && "ожидание"}
            {orb === "listening" && "слушаю"}
            {orb === "thinking" && "думаю"}
            {orb === "speaking" && "говорю"}
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-500">
          Настроение: {MOOD_LABEL[mood] ?? mood}
        </p>
      </div>

      <section
        ref={scrollRef}
        className="jt-scroll min-h-0 flex-1 space-y-2 rounded-xl border border-slate-800/80 bg-black/30 p-2"
      >
        {chat.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-slate-500">
            Скажите «привет», «посчитай 12*7» или «запусти бота».
          </p>
        )}
        {chat.map((m, idx) => (
          <div key={m.id ?? idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-md ${
                m.role === "user"
                  ? "bg-cyan-600 text-white"
                  : "border border-slate-700/80 bg-slate-900/80 text-slate-100"
              }`}
            >
              {m.role === "jarvis" && (
                <p className="mb-1 text-[0.6rem] uppercase tracking-widest text-cyan-400/70">
                  Jarvis{m.mood ? ` · ${MOOD_LABEL[m.mood] ?? m.mood}` : ""}
                </p>
              )}
              {m.content}
            </div>
          </div>
        ))}
      </section>

      <form onSubmit={onSubmit} className="flex shrink-0 items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Команда Джарвису…"
          className="min-h-11 flex-1 rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={engineStatus !== "ready" || !input.trim()}
          className="min-h-11 rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          →
        </button>
      </form>

      <button
        type="button"
        onClick={clearHistory}
        className="shrink-0 self-center text-[10px] uppercase tracking-wider text-slate-600 hover:text-rose-300"
      >
        Очистить историю
      </button>
    </div>
  );
}

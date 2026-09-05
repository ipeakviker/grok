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
      <div className="jt-chat-orb-wrap">
        <div className={orbClasses}>
          <div className="absolute inset-[18%] rounded-full bg-slate-950/55 backdrop-blur-sm" />
          <div className="absolute inset-0 flex items-center justify-center font-mono text-[0.55rem] uppercase tracking-[0.22em] text-cyan-100/85">
            {orb === "idle" && "ожидание"}
            {orb === "listening" && "слушаю"}
            {orb === "thinking" && "думаю"}
            {orb === "speaking" && "говорю"}
          </div>
        </div>
        <p className="jt-label text-center">
          Настроение · <span className="text-sky-300/80">{MOOD_LABEL[mood] ?? mood}</span>
        </p>
      </div>

      <section
        ref={scrollRef}
        className="jt-chat-transcript jt-scroll min-h-0 flex-1 space-y-2.5 p-2.5"
      >
        {chat.length === 0 && (
          <div className="jt-empty py-8">
            <div className="jt-empty__icon">⌘</div>
            <p>Скажите «привет», «посчитай 12*7» или «запусти бота».</p>
            <p className="text-[10px] text-slate-600">Голосовая или текстовая команда</p>
          </div>
        )}
        {chat.map((m, idx) => (
          <div key={m.id ?? idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[92%] px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "jt-chat-bubble-user" : "jt-chat-bubble-ai"
              }`}
            >
              {m.role === "jarvis" && (
                <p className="mb-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-sky-400/75">
                  Jarvis{m.mood ? ` · ${MOOD_LABEL[m.mood] ?? m.mood}` : ""}
                </p>
              )}
              {m.content}
            </div>
          </div>
        ))}
      </section>

      <form onSubmit={onSubmit} className="shrink-0">
        <div className="jt-console-input">
          <span className="jt-console-input__prompt" aria-hidden>
            ›_
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Команда Джарвису…"
            aria-label="Команда Джарвису"
          />
          <button
            type="submit"
            disabled={engineStatus !== "ready" || !input.trim()}
            className="jt-console-send"
            aria-label="Отправить"
          >
            →
          </button>
        </div>
      </form>

      <button
        type="button"
        onClick={clearHistory}
        className="shrink-0 self-center font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600 transition hover:text-rose-300"
      >
        Очистить историю
      </button>
    </div>
  );
}

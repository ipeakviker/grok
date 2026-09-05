"use client";

import { useCallback, useState } from "react";
import {
  ARCHITECTURE,
  buildAssistantSnapshot,
  buildDashboardContext,
  matchDashboardIntent,
} from "@/lib/dashboard-context";
import type { ChatMessage } from "@/components/CommandChatPanel";
import type { TerminalState } from "@/lib/terminal-store";
import { speak } from "@/lib/voice-utils";

type Props = {
  state: TerminalState | null;
  chat: ChatMessage[];
  engineVersion: string;
  engineStatus: string;
  btc: number;
  eth: number;
  ttsEnabled: boolean;
  onAskGlobal?: (text: string) => void;
};

type LocalMsg = { role: "user" | "rustaman"; content: string };

export default function RustamanPanel({
  state,
  chat,
  engineVersion,
  engineStatus,
  btc,
  eth,
  ttsEnabled,
}: Props) {
  const [localChat, setLocalChat] = useState<LocalMsg[]>([]);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const botsLive = state ? state.bots.filter((b) => b.running).length : 0;
  const agentsOn = state ? state.agents.filter((a) => a.active).length : 0;
  const contextLine = buildDashboardContext(state, { engineVersion, btc, eth });

  const copySnapshot = useCallback(async () => {
    const snap = buildAssistantSnapshot(state, chat, engineVersion);
    const text = JSON.stringify(snap, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    }
  }, [state, chat, engineVersion]);

  const sendLocal = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed || busy) return;
      setBusy(true);
      setLocalChat((prev) => [...prev, { role: "user", content: trimmed }]);
      setInput("");
      try {
        const hit = matchDashboardIntent(trimmed, state, { engineVersion, btc, eth });
        let reply: string;
        if (hit) {
          reply = hit.reply;
        } else if (/привет|здравств|hello|hi\b/.test(trimmed.toLowerCase())) {
          reply =
            "RUSTaman на связи — ассистент оператора Command Center. Спросите «что на экране», «портфель», «архитектура» или скопируйте снимок для Grok Bot.";
        } else {
          reply = `Контекст дашборда: ${contextLine} Если нужен точный статус — спросите «что на экране» или «портфель». Для внешнего чата нажмите «Снимок для ассистента».`;
        }
        setLocalChat((prev) => [...prev, { role: "rustaman", content: reply }]);
        if (ttsEnabled) void speak(reply);
      } finally {
        setBusy(false);
      }
    },
    [busy, state, engineVersion, btc, eth, contextLine, ttsEnabled],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-mono text-[11px] tracking-[0.2em] text-violet-300 uppercase">RUSTaman</div>
          <p className="mt-0.5 text-[11px] text-slate-500">ассистент оператора · live telemetry + architecture</p>
        </div>
        <button
          type="button"
          onClick={() => void copySnapshot()}
          className={`jt-pill-btn text-[11px] ${copied ? "jt-pill-btn--on" : ""}`}
        >
          {copied ? "✓ Скопировано" : "📋 Снимок для ассистента"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Kpi label="Equity" value={state ? `$${state.totalValue.toFixed(2)}` : "—"} />
        <Kpi
          label="uPnL"
          value={state ? `${state.unrealized >= 0 ? "+" : ""}$${state.unrealized.toFixed(2)}` : "—"}
          tone={state && state.unrealized >= 0 ? "green" : "red"}
        />
        <Kpi label="Bots" value={`${botsLive}/${state?.bots.length ?? 0}`} />
        <Kpi label="Agents" value={`${agentsOn}/${state?.agents.length ?? 0}`} />
      </div>

      <div className="jt-panel rounded-lg px-3 py-2 text-[11px] leading-relaxed text-slate-400">
        <div className="jt-label mb-1 text-violet-300/80">Телеметрия</div>
        <p className="text-slate-300">{contextLine}</p>
        <p className="mt-1 font-mono text-[10px] text-slate-600">
          engine {engineVersion || "…"} · {engineStatus} · basePath {ARCHITECTURE.basePath}
        </p>
      </div>

      <div className="jt-panel rounded-lg px-3 py-2">
        <div className="jt-label mb-1.5 text-sky-300/80">Architecture map</div>
        <ul className="space-y-1 font-mono text-[10px] leading-snug text-slate-400">
          <li>
            <span className="text-slate-500">FE</span> · {ARCHITECTURE.frontend}
          </li>
          <li>
            <span className="text-slate-500">BE</span> · {ARCHITECTURE.backend}
          </li>
          <li>
            <span className="text-slate-500">WASM</span> · {ARCHITECTURE.wasm}
          </li>
          <li>
            <span className="text-slate-500">CI</span> · {ARCHITECTURE.ci}
          </li>
          <li>
            <span className="text-slate-500">Repo</span> · {ARCHITECTURE.repo}
          </li>
        </ul>
      </div>

      <section className="jt-chat-transcript jt-scroll min-h-0 flex-1 space-y-2 p-2">
        {localChat.length === 0 && (
          <div className="jt-empty py-4">
            <div className="jt-empty__icon">◈</div>
            <p className="text-[12px]">Спросите про экран, портфель или архитектуру.</p>
          </div>
        )}
        {localChat.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[94%] px-3 py-2 text-[12px] leading-relaxed ${
                m.role === "user" ? "jt-chat-bubble-user" : "jt-chat-bubble-ai"
              }`}
            >
              {m.role === "rustaman" && (
                <p className="mb-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-violet-300/80">
                  RUSTaman
                </p>
              )}
              {m.content}
            </div>
          </div>
        ))}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendLocal(input);
        }}
        className="shrink-0"
      >
        <div className="jt-console-input">
          <span className="jt-console-input__prompt" aria-hidden>
            ›_
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Вопрос RUSTaman…"
            aria-label="Вопрос RUSTaman"
          />
          <button type="submit" disabled={busy || !input.trim()} className="jt-console-send" aria-label="Отправить">
            →
          </button>
        </div>
      </form>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "green" | "red" }) {
  return (
    <div className="jt-panel rounded-md px-2.5 py-2">
      <div className="jt-label">{label}</div>
      <div
        className={`jt-num mt-0.5 text-sm font-semibold ${
          tone === "green" ? "jt-green" : tone === "red" ? "jt-red" : "text-slate-100"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

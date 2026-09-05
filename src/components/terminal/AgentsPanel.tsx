"use client";

import type { AgentState } from "@/lib/terminal-store";

type Props = {
  agents: AgentState[];
  onToggle: (id: string) => void;
  onAsk: (id: string) => void;
  busy?: boolean;
};

export default function AgentsPanel({ agents, onToggle, onAsk, busy }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.2em] text-sky-300 uppercase">
            AI Агенты
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">JarvisEngine.process · market commentary</p>
        </div>
      </div>

      <div className="grid gap-2.5">
        {agents.map((a) => (
          <div key={a.id} className={`jt-card flex flex-col ${a.active ? "jt-card--running" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-mono text-sm text-slate-100">{a.name}</div>
                <div className="mt-0.5 text-[11px] text-slate-500">{a.role}</div>
              </div>
              <button
                type="button"
                onClick={() => onToggle(a.id)}
                className={`jt-badge ${a.active ? "jt-badge--live" : ""}`}
                aria-pressed={a.active}
              >
                <span className={`jt-dot ${a.active ? "jt-dot-live" : ""}`} />
                {a.active ? "ON" : "OFF"}
              </button>
            </div>

            <div className="jt-label mt-3">Last signal</div>
            <div className="jt-scroll mt-1 min-h-[68px] flex-1 rounded-lg border border-sky-500/15 bg-black/35 p-2 font-mono text-[11px] leading-relaxed text-slate-300">
              {a.lastSignal || (
                <span className="text-slate-600">Ожидание сигнала…</span>
              )}
            </div>

            <button
              type="button"
              disabled={!a.active || busy}
              onClick={() => onAsk(a.id)}
              className="jt-action-btn jt-action-btn--ask"
            >
              {busy ? "Обработка…" : "Запросить сигнал"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

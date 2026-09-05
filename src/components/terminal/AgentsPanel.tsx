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
          <h2 className="text-sm font-semibold tracking-wide text-cyan-300">AI АГЕНТЫ</h2>
          <p className="text-xs text-slate-500">JarvisEngine.process · комментарии по тикам рынка</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {agents.map((a) => (
          <div key={a.id} className="jt-panel flex flex-col p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-sm text-slate-100">{a.name}</div>
                <div className="text-[11px] text-slate-500">{a.role}</div>
              </div>
              <button
                type="button"
                onClick={() => onToggle(a.id)}
                className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  a.active ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"
                }`}
              >
                {a.active ? "ON" : "OFF"}
              </button>
            </div>

            <div className="jt-scroll mt-3 min-h-[72px] flex-1 rounded border border-slate-800/80 bg-black/40 p-2 font-mono text-[11px] leading-relaxed text-slate-300">
              {a.lastSignal}
            </div>

            <button
              type="button"
              disabled={!a.active || busy}
              onClick={() => onAsk(a.id)}
              className="mt-3 rounded border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Запросить сигнал
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

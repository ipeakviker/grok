"use client";

import type { DemoBot } from "@/lib/terminal-store";
import Sparkline from "./Sparkline";

type Props = {
  bots: DemoBot[];
  onToggle: (id: string) => void;
};

const STRATEGY_RU: Record<string, string> = {
  grid: "Сетка",
  "mean-reversion": "Mean-reversion",
  momentum: "Momentum",
};

export default function BotsPanel({ bots, onToggle }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-cyan-300">ТОРГОВЫЕ БОТЫ</h2>
          <p className="text-xs text-slate-500">Симуляция · localStorage · сигналы из WASM</p>
        </div>
        <span className="jt-badge">{bots.filter((b) => b.running).length} LIVE</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {bots.map((b) => (
          <div key={b.id} className="jt-panel p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-mono text-sm text-slate-100">{b.name}</div>
                <div className="text-[11px] text-slate-500">
                  {STRATEGY_RU[b.strategy] ?? b.strategy} · {b.token}
                </div>
              </div>
              <span className={`jt-dot ${b.running ? "jt-dot-live" : ""}`} />
            </div>

            <div className="mt-3 flex items-center justify-between">
              <Sparkline seed={b.seed} width={100} height={28} color={b.running ? "#22c55e" : "#64748b"} />
              <div className="text-right font-mono text-xs">
                <div className={b.pnl >= 0 ? "jt-green" : "jt-red"}>
                  {b.pnl >= 0 ? "+" : ""}${b.pnl.toFixed(2)}
                </div>
                <div className="text-slate-500">{b.fills} fills</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onToggle(b.id)}
              className={`mt-3 w-full rounded border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition ${
                b.running
                  ? "border-rose-500/50 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20"
                  : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              }`}
            >
              {b.running ? "■ Stop" : "▶ Start"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

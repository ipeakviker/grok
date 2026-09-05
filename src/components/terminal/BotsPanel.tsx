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
  const live = bots.filter((b) => b.running).length;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="font-mono text-[11px] font-semibold tracking-[0.2em] text-sky-300 uppercase">
            Торговые боты
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Симуляция · localStorage · сигналы WASM</p>
        </div>
        <span className={`jt-badge ${live > 0 ? "jt-badge--live" : ""}`}>
          {live > 0 ? <span className="jt-dot jt-dot-live" /> : null}
          {live} LIVE
        </span>
      </div>

      <div className="grid gap-2.5 md:grid-cols-1 xl:grid-cols-1">
        {bots.map((b) => {
          const progress = Math.min(100, 12 + (b.fills % 20) * 4 + (b.running ? 28 : 0));
          return (
            <div key={b.id} className={`jt-card ${b.running ? "jt-card--running" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono text-sm text-slate-100">{b.name}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {STRATEGY_RU[b.strategy] ?? b.strategy} · {b.token}
                  </div>
                </div>
                <span className={`jt-badge ${b.running ? "jt-badge--live" : ""}`}>
                  <span className={`jt-dot ${b.running ? "jt-dot-live" : ""}`} />
                  {b.running ? "RUNNING" : "IDLE"}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Sparkline seed={b.seed} width={100} height={28} color={b.running ? "#00e676" : "#64748b"} />
                <div className="text-right font-mono text-xs">
                  <div className={`jt-num ${b.pnl >= 0 ? "jt-green" : "jt-red"}`}>
                    {b.pnl >= 0 ? "+" : ""}${b.pnl.toFixed(2)}
                  </div>
                  <div className="text-slate-500">{b.fills} fills</div>
                </div>
              </div>

              <div className="jt-card__progress" title="Activity">
                <span style={{ width: `${progress}%` }} />
              </div>

              <button
                type="button"
                onClick={() => onToggle(b.id)}
                className={`jt-action-btn ${b.running ? "jt-action-btn--stop" : "jt-action-btn--start"}`}
              >
                {b.running ? "■ Stop" : "▶ Start"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

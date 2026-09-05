"use client";

import Sparkline from "./Sparkline";

type Props = {
  totalValue: number;
  unrealized: number;
  realized: number;
  tradeable: number;
  pulse: number;
};

function fmt(n: number, digits = 2) {
  const sign = n > 0 ? "+" : "";
  return `${sign}$${Math.abs(n).toFixed(digits)}`;
}

export default function PortfolioHeader({ totalValue, unrealized, realized, tradeable, pulse }: Props) {
  const up = unrealized >= 0;
  return (
    <div className="grid gap-2 md:grid-cols-3">
      <div className="jt-panel relative overflow-hidden p-3">
        <div className="jt-label">TOTAL VALUE</div>
        <div className="jt-kpi">${totalValue.toFixed(2)}</div>
        <div className={`mt-1 text-sm font-mono ${up ? "jt-green" : "jt-red"}`}>
          Unrealized {fmt(unrealized)}
        </div>
        <div className="pointer-events-none absolute bottom-1 right-1 opacity-80">
          <Sparkline seed={3} width={140} height={36} color={up ? "#22c55e" : "#f43f5e"} />
        </div>
      </div>

      <div className="jt-panel p-3 md:col-span-1">
        <div className="jt-label">PERFORMANCE</div>
        <div className="mt-2 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Total PnL</span>
            <span className={realized + unrealized >= 0 ? "jt-green" : "jt-red"}>
              {fmt(realized + unrealized)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Realized</span>
            <span className="text-slate-200">{fmt(realized)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Tradeable</span>
            <span className="jt-cyan">${tradeable.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pulse</span>
            <span className="jt-cyan">{(pulse * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-800">
          <div
            className="h-full rounded bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
            style={{ width: `${Math.max(8, pulse * 100)}%` }}
          />
        </div>
      </div>

      <div className="jt-panel p-3">
        <div className="jt-label">DIST · WINS / LOSSES</div>
        <div className="mt-3 flex h-16 items-end gap-1">
          {[0.3, 0.55, 0.8, 0.45, 0.2, 0.35, 0.6].map((h, i) => (
            <div
              key={i}
              className={`flex-1 rounded-sm ${i < 4 ? "bg-emerald-500/80" : "bg-rose-500/80"}`}
              style={{ height: `${h * 100}%`, boxShadow: `0 0 8px ${i < 4 ? "#22c55e55" : "#f43f5e55"}` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] text-slate-500">
          <span>&gt;500%</span>
          <span>0</span>
          <span>&lt;-50%</span>
        </div>
      </div>
    </div>
  );
}

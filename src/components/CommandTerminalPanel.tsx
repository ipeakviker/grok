"use client";

import ActivityFeed from "@/components/terminal/ActivityFeed";
import AnimatedChart from "@/components/terminal/AnimatedChart";
import PortfolioHeader from "@/components/terminal/PortfolioHeader";
import PositionsTable from "@/components/terminal/PositionsTable";
import type { TerminalState } from "@/lib/terminal-store";

type Props = {
  state: TerminalState | null;
  pulse: number;
  expanded: boolean;
};

export default function CommandTerminalPanel({ state, pulse, expanded }: Props) {
  if (!state) {
    return (
      <div className="jt-empty h-full min-h-[200px]">
        <div className="jt-empty__icon">WASM</div>
        <p>Загрузка терминала…</p>
        <div className="jt-skeleton mt-3 h-24 w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2 sm:p-3">
      <PortfolioHeader
        totalValue={state.totalValue}
        unrealized={state.unrealized}
        realized={state.realized}
        tradeable={state.tradeable}
        pulse={pulse}
      />
      <div className={`grid min-h-[140px] gap-2 ${expanded ? "flex-1 lg:grid-cols-5" : "lg:grid-cols-5"}`}>
        <div className="min-h-[120px] lg:col-span-3">
          <AnimatedChart seed={21} mode="price" title="REALIZED / MARKET · PRICE WAVE" accent="#38bdf8" />
        </div>
        <div className="min-h-[120px] lg:col-span-2">
          <AnimatedChart seed={34} mode="pnl" title="PNL STREAM" accent="#00e676" />
        </div>
      </div>
      <div className={`grid min-h-[160px] gap-2 ${expanded ? "min-h-0 flex-1 lg:grid-cols-5" : "lg:grid-cols-5"}`}>
        <div className="min-h-[140px] lg:col-span-3">
          <PositionsTable positions={state.positions} />
        </div>
        <div className="min-h-[140px] lg:col-span-2">
          <ActivityFeed items={state.activity} />
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * Legacy section view — kept for compatibility.
 * Primary UX is the Command Center in JarvisApp (single-screen HUD).
 */
import { useTerminalSim } from "@/lib/use-terminal-sim";
import ActivityFeed from "./ActivityFeed";
import AgentsPanel from "./AgentsPanel";
import AnimatedChart from "./AnimatedChart";
import BotsPanel from "./BotsPanel";
import PortfolioHeader from "./PortfolioHeader";
import PositionsTable from "./PositionsTable";

export default function TerminalShell({
  section = "overview",
}: {
  section?: "overview" | "bots" | "agents";
}) {
  const { state, pulse, btc, eth, clock, agentBusy, toggleBot, toggleAgent, askAgent } = useTerminalSim();

  if (!state) {
    return (
      <div className="jt-root flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Загрузка терминала…
      </div>
    );
  }

  return (
    <div className="jt-root flex min-h-0 flex-1 flex-col">
      <div className="jt-subnav flex flex-wrap items-center gap-2 px-3 py-2">
        <span className="font-mono text-[11px] tracking-[0.2em] text-cyan-400/90">JARVIS // TERMINAL</span>
        <span className="jt-badge">DEMO SIM</span>
        <div className="ml-auto flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>PRESET 1</span>
          <span className="jt-dot jt-dot-live" />
          <span>EU-C</span>
        </div>
      </div>

      {section === "overview" && (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2 sm:p-3">
          <PortfolioHeader
            totalValue={state.totalValue}
            unrealized={state.unrealized}
            realized={state.realized}
            tradeable={state.tradeable}
            pulse={pulse}
          />
          <div className="grid min-h-[180px] flex-1 gap-2 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <AnimatedChart seed={21} mode="price" title="PRICE WAVE · WASM" accent="#22d3ee" />
            </div>
            <div className="lg:col-span-2">
              <AnimatedChart seed={34} mode="pnl" title="PNL STREAM" accent="#22c55e" />
            </div>
          </div>
          <div className="grid min-h-[220px] flex-1 gap-2 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <PositionsTable positions={state.positions} />
            </div>
            <div className="lg:col-span-2">
              <ActivityFeed items={state.activity} />
            </div>
          </div>
        </div>
      )}

      {section === "bots" && (
        <div className="flex-1 overflow-auto p-3">
          <BotsPanel bots={state.bots} onToggle={toggleBot} />
        </div>
      )}

      {section === "agents" && (
        <div className="flex-1 overflow-auto p-3">
          <AgentsPanel agents={state.agents} onToggle={toggleAgent} onAsk={askAgent} busy={agentBusy} />
        </div>
      )}

      <footer className="jt-footer flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
        <span className="text-cyan-400/80">J.A.R.V.I.S.</span>
        <span>BTC ${btc.toFixed(0)}</span>
        <span>ETH ${eth.toFixed(0)}</span>
        <span className="jt-dot jt-dot-live" />
        <span>LIVE</span>
        <span className="ml-auto">{clock}</span>
      </footer>
    </div>
  );
}

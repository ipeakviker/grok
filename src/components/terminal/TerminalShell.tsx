"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  botSignal,
  createJarvisEngine,
  getWasmModule,
  pulseMeter,
  tickMarket,
  type JarvisEngineHandle,
} from "@/lib/jarvis-engine";
import {
  loadTerminalState,
  saveTerminalState,
  type ActivityItem,
  type TerminalState,
} from "@/lib/terminal-store";
import ActivityFeed from "./ActivityFeed";
import AgentsPanel from "./AgentsPanel";
import AnimatedChart from "./AnimatedChart";
import BotsPanel from "./BotsPanel";
import PortfolioHeader from "./PortfolioHeader";
import PositionsTable from "./PositionsTable";

type Tab = "overview" | "bots" | "agents";

function ageLabel(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export default function TerminalShell({
  section = "overview",
}: {
  section?: "overview" | "bots" | "agents";
}) {
  const [state, setState] = useState<TerminalState | null>(null);
  const [pulse, setPulse] = useState(0.5);
  const [btc, setBtc] = useState(79700);
  const [eth, setEth] = useState(2459);
  const [clock, setClock] = useState("");
  const [agentBusy, setAgentBusy] = useState(false);
  const engineRef = useRef<JarvisEngineHandle | null>(null);
  const stateRef = useRef<TerminalState | null>(null);
  const lastBotTick = useRef(0);

  useEffect(() => {
    const s = loadTerminalState();
    setState(s);
    stateRef.current = s;
  }, []);

  useEffect(() => {
    if (!state) return;
    stateRef.current = state;
    saveTerminalState(state);
  }, [state]);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    const t0 = performance.now();

    (async () => {
      let mod: Awaited<ReturnType<typeof getWasmModule>>;
      try {
        mod = await getWasmModule();
        if (!engineRef.current) engineRef.current = await createJarvisEngine();
      } catch {
        return;
      }

      const tick = (now: number) => {
        if (cancelled) return;
        const t = (now - t0) / 1000;
        setPulse(pulseMeter(mod, 99, t));
        const b = tickMarket(mod, 1, t);
        const e = tickMarket(mod, 2, t * 1.05);
        setBtc(79000 + b.changePct * 40 + b.price);
        setEth(2400 + e.changePct * 8 + e.price * 0.2);
        setClock(new Date().toLocaleTimeString("ru-RU"));

        const cur = stateRef.current;
        if (cur && now - lastBotTick.current > 1250) {
          const running = cur.bots.filter((x) => x.running);
          if (running.length) {
            lastBotTick.current = now;
            setState((prev) => {
              if (!prev) return prev;
              let next = { ...prev, bots: [...prev.bots], activity: [...prev.activity], positions: [...prev.positions] };
              for (const bot of running) {
                const sig = botSignal(mod, bot.seed, bot.strategy, t);
                const idx = next.bots.findIndex((b) => b.id === bot.id);
                if (idx < 0) continue;
                const delta = (sig.side === "buy" ? 1 : -1) * (0.05 + sig.confidence * 0.35);
                const updated = {
                  ...next.bots[idx],
                  fills: next.bots[idx].fills + 1,
                  pnl: Number((next.bots[idx].pnl + delta).toFixed(2)),
                };
                next.bots[idx] = updated;
                const act: ActivityItem = {
                  id: `f-${bot.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type: sig.side === "buy" ? "Buy" : "Sell",
                  token: bot.token,
                  amount: Number((0.1 + sig.confidence).toFixed(2)),
                  mcap: bot.token === "BTC" ? "$1.5T" : bot.token === "ETH" ? "$290B" : "$62B",
                  age: "now",
                  ts: Date.now(),
                };
                next.activity = [act, ...next.activity].slice(0, 50);
                next.totalValue = Number((next.totalValue + delta * 0.15).toFixed(2));
                next.unrealized = Number((next.unrealized + delta * 0.08).toFixed(2));
                next.realized = Number((next.realized + Math.max(0, delta) * 0.05).toFixed(2));
                next.positions = next.positions.map((p) =>
                  p.token === bot.token
                    ? {
                        ...p,
                        pnlPct: Number((p.pnlPct + delta * 0.4).toFixed(1)),
                        remaining:
                          sig.side === "buy"
                            ? Number((p.remaining + 0.01).toFixed(3))
                            : Math.max(0, Number((p.remaining - 0.01).toFixed(3))),
                      }
                    : p,
                );
              }
              next.activity = next.activity.map((a) => ({ ...a, age: ageLabel(a.ts) }));
              return next;
            });
          }
        }

        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(async () => {
      const cur = stateRef.current;
      if (!cur) return;
      const active = cur.agents.filter((a) => a.active);
      if (!active.length) return;
      try {
        if (!engineRef.current) engineRef.current = await createJarvisEngine();
        const mod = await getWasmModule();
        const t = performance.now() / 1000;
        const tick = tickMarket(mod, 5, t);
        for (const ag of active) {
          const prompt =
            ag.id === "scout"
              ? `рынок сигнал тренд change ${tick.changePct.toFixed(2)} price ${tick.price.toFixed(2)}`
              : ag.id === "risk"
                ? `риск pnl ${tick.pnl.toFixed(2)} unrealized ${tick.unrealized.toFixed(2)} волатильность`
                : `сентимент market volume ${tick.volume.toFixed(0)} change ${tick.changePct.toFixed(2)}`;
          const res = engineRef.current.process(prompt);
          setState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              agents: prev.agents.map((a) =>
                a.id === ag.id ? { ...a, lastSignal: res.reply, lastAt: Date.now() } : a,
              ),
            };
          });
        }
      } catch {
        /* ignore */
      }
    }, 14000);
    return () => clearInterval(id);
  }, []);

  const toggleBot = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        bots: prev.bots.map((b) => (b.id === id ? { ...b, running: !b.running } : b)),
      };
    });
  }, []);

  const toggleAgent = useCallback((id: string) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        agents: prev.agents.map((a) =>
          a.id === id
            ? { ...a, active: !a.active, lastSignal: !a.active ? "Активирован…" : "Выключен" }
            : a,
        ),
      };
    });
  }, []);

  const askAgent = useCallback(async (id: string) => {
    const cur = stateRef.current;
    if (!cur) return;
    setAgentBusy(true);
    try {
      if (!engineRef.current) engineRef.current = await createJarvisEngine();
      const mod = await getWasmModule();
      const tick = tickMarket(mod, 8, performance.now() / 1000);
      const ag = cur.agents.find((a) => a.id === id);
      const prompt =
        id === "scout"
          ? `scout рынок импульс ${tick.changePct.toFixed(2)}%`
          : id === "risk"
            ? `risk риск портфель pnl ${tick.pnl.toFixed(2)}`
            : `sentiment сентимент объём ${tick.volume.toFixed(0)}`;
      const res = engineRef.current.process(prompt);
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          agents: prev.agents.map((a) =>
            a.id === id ? { ...a, lastSignal: `${ag?.name ?? id}: ${res.reply}`, lastAt: Date.now() } : a,
          ),
        };
      });
    } finally {
      setAgentBusy(false);
    }
  }, []);

  if (!state) {
    return (
      <div className="jt-root flex min-h-[50vh] items-center justify-center text-sm text-slate-500">
        Загрузка терминала…
      </div>
    );
  }

  const tab: Tab = section;

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

      {tab === "overview" && (
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

      {tab === "bots" && (
        <div className="flex-1 overflow-auto p-3">
          <BotsPanel bots={state.bots} onToggle={toggleBot} />
        </div>
      )}

      {tab === "agents" && (
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

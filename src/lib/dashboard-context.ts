"use client";

import type { ChatMessage } from "@/components/CommandChatPanel";
import type { TerminalState } from "@/lib/terminal-store";

export type DashboardSnapshot = {
  at: string;
  basePath: string;
  engineVersion: string;
  portfolio: {
    totalValue: number;
    unrealized: number;
    realized: number;
    tradeable: number;
  };
  bots: { id: string; name: string; running: boolean; pnl: number; strategy: string; token: string }[];
  agents: { id: string; name: string; active: boolean; lastSignal: string }[];
  positions: { token: string; remaining: number; pnlPct: number }[];
  lastActivity: { type: string; token: string; amount: number; age: string }[];
  recentChat: { role: string; content: string }[];
  architecture: typeof ARCHITECTURE;
};

export const ARCHITECTURE = {
  repo: "ipeakviker/grok",
  live: "https://ipeakviker.github.io/grok/",
  frontend: "Next.js static HUD · src/components · store localStorage",
  backend: "Нет Node API на Pages · логика = Rust WASM jarvis-core + client sim",
  wasm: "rust/jarvis-core → wasm-pack → public/wasm/jarvis-core",
  ci: ".github/workflows/deploy-pages.yml · wasm-pack → next export → GitHub Pages",
  basePath: "/grok",
  voice: "Web Speech fallback · опционально OpenAI Whisper + TTS (ключ в localStorage)",
} as const;

export function buildDashboardContext(
  state: TerminalState | null,
  opts?: { engineVersion?: string; btc?: number; eth?: number },
): string {
  if (!state) return "Терминал ещё загружается.";
  const botsLive = state.bots.filter((b) => b.running);
  const agentsOn = state.agents.filter((a) => a.active);
  const last = state.activity[0];
  const lines = [
    `Портфель: equity $${state.totalValue.toFixed(2)}, uPnL ${fmtSigned(state.unrealized)}, realized $${state.realized.toFixed(2)}, cash $${state.tradeable.toFixed(2)}.`,
    `Боты: ${botsLive.length}/${state.bots.length} running` +
      (botsLive.length
        ? ` (${botsLive.map((b) => `${b.name} ${fmtSigned(b.pnl)}`).join(", ")})`
        : " — все остановлены") +
      ".",
    `Агенты: ${agentsOn.length}/${state.agents.length} active` +
      (agentsOn.length ? ` (${agentsOn.map((a) => a.name).join(", ")})` : "") +
      ".",
    `Позиции: ${state.positions.map((p) => `${p.token} ${fmtSigned(p.pnlPct)}%`).join(", ") || "нет"}.`,
    last ? `Последняя активность: ${last.type} ${last.token} ×${last.amount} (${last.age}).` : "",
    opts?.btc != null ? `Котировки: BTC $${opts.btc.toFixed(0)}, ETH $${(opts.eth ?? 0).toFixed(0)}.` : "",
    opts?.engineVersion ? `Движок: ${opts.engineVersion}.` : "",
  ];
  return lines.filter(Boolean).join(" ");
}

function fmtSigned(n: number) {
  return `${n >= 0 ? "+" : ""}$${n.toFixed(2)}`;
}

/** TS pre-router: status / portfolio / agents questions answered from live telemetry. */
export function matchDashboardIntent(
  text: string,
  state: TerminalState | null,
  opts?: { engineVersion?: string; btc?: number; eth?: number },
): { reply: string; intent: string; mood: string } | null {
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!t) return null;

  const statusAsk =
    /что\s+на\s+экране|статус\s+систем|состояние\s+систем|что\s+происходит|обзор\s+дашборд|dashboard\s+status|system\s+status|снимок|telemetry|телеметри/.test(
      t,
    );
  const portfolioAsk =
    /портфел|portfolio|pnl|пнл|баланс|equity|капитал|unrealized|u\s*pnl|реализован|tradeable|позиции|позици|positions?/.test(
      t,
    );
  const botsAsk = /статус\s+бот|боты\s+статус|какие\s+боты|bots?\s+status|сколько\s+бот/.test(t);
  const agentsAsk = /агент|сигнал|agents?|signals?/.test(t) && !/запусти|останови|включи|выключи/.test(t);
  const archAsk =
    /архитектур|как\s+устроен|что\s+за\s+бэкенд|backend|frontend|wasm|rustaman|как\s+работает\s+приложение|github\s+pages|basepath|base\s*path/.test(
      t,
    );

  if (!state && (statusAsk || portfolioAsk || botsAsk || agentsAsk)) {
    return { reply: "Терминал ещё загружается — подождите секунду.", intent: "status", mood: "neutral" };
  }

  if (archAsk) {
    return {
      reply: [
        "RUSTaman знает карту приложения:",
        `Frontend: ${ARCHITECTURE.frontend}.`,
        `«Backend»: ${ARCHITECTURE.backend}.`,
        `CI: ${ARCHITECTURE.ci}.`,
        `Репозиторий ${ARCHITECTURE.repo}, basePath ${ARCHITECTURE.basePath}.`,
        `Live: ${ARCHITECTURE.live}.`,
      ].join(" "),
      intent: "architecture",
      mood: "proud",
    };
  }

  if (statusAsk) {
    return {
      reply: `На экране сейчас: ${buildDashboardContext(state, opts)}`,
      intent: "status",
      mood: "happy",
    };
  }

  if (portfolioAsk && state) {
    const pos = state.positions
      .map((p) => `${p.token}: ${p.remaining} ост., PnL ${p.pnlPct >= 0 ? "+" : ""}${p.pnlPct}%`)
      .join("; ");
    return {
      reply: `Портфель: equity $${state.totalValue.toFixed(2)}, нереализ. ${fmtSigned(state.unrealized)}, реализ. $${state.realized.toFixed(2)}, доступно $${state.tradeable.toFixed(2)}. Позиции — ${pos}.`,
      intent: "portfolio",
      mood: state.unrealized >= 0 ? "happy" : "confused",
    };
  }

  if (botsAsk && state) {
    const list = state.bots
      .map((b) => `${b.name} (${b.strategy}/${b.token}): ${b.running ? "RUN" : "STOP"} PnL ${fmtSigned(b.pnl)}`)
      .join("; ");
    return {
      reply: `Боты: ${list}. Голосовые команды: «запусти бота» / «останови ботов».`,
      intent: "bots",
      mood: "neutral",
    };
  }

  if (agentsAsk && state) {
    const list = state.agents
      .map((a) => `${a.name}: ${a.active ? "ON" : "OFF"} — ${a.lastSignal.slice(0, 80)}`)
      .join("; ");
    return {
      reply: `Агенты и сигналы: ${list}.`,
      intent: "agents",
      mood: "neutral",
    };
  }

  return null;
}

export function buildAssistantSnapshot(
  state: TerminalState | null,
  chat: ChatMessage[],
  engineVersion: string,
): DashboardSnapshot {
  const s = state;
  return {
    at: new Date().toISOString(),
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "/grok",
    engineVersion: engineVersion || "unknown",
    portfolio: {
      totalValue: s?.totalValue ?? 0,
      unrealized: s?.unrealized ?? 0,
      realized: s?.realized ?? 0,
      tradeable: s?.tradeable ?? 0,
    },
    bots: (s?.bots ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      running: b.running,
      pnl: b.pnl,
      strategy: b.strategy,
      token: b.token,
    })),
    agents: (s?.agents ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      active: a.active,
      lastSignal: a.lastSignal,
    })),
    positions: (s?.positions ?? []).map((p) => ({
      token: p.token,
      remaining: p.remaining,
      pnlPct: p.pnlPct,
    })),
    lastActivity: (s?.activity ?? []).slice(0, 8).map((a) => ({
      type: a.type,
      token: a.token,
      amount: a.amount,
      age: a.age,
    })),
    recentChat: chat.slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 400) })),
    architecture: ARCHITECTURE,
  };
}

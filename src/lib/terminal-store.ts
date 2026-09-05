"use client";

export type BotStrategy = "grid" | "mean-reversion" | "momentum";

export interface DemoBot {
  id: string;
  name: string;
  strategy: BotStrategy;
  token: string;
  running: boolean;
  fills: number;
  pnl: number;
  seed: number;
}

export interface Position {
  id: string;
  token: string;
  bought: number;
  sold: number;
  remaining: number;
  pnlPct: number;
  openedAgo: string;
}

export interface ActivityItem {
  id: string;
  type: "Buy" | "Sell";
  token: string;
  amount: number;
  mcap: string;
  age: string;
  ts: number;
}

export interface AgentState {
  id: string;
  name: string;
  role: string;
  active: boolean;
  lastSignal: string;
  lastAt?: number;
}

export interface TerminalState {
  totalValue: number;
  unrealized: number;
  realized: number;
  tradeable: number;
  bots: DemoBot[];
  positions: Position[];
  activity: ActivityItem[];
  agents: AgentState[];
  range: "1d" | "7d" | "30d" | "max";
}

const KEY = "jarvis-terminal-v1";

const DEFAULT_BOTS: DemoBot[] = [
  { id: "bot-grid", name: "Grid Alpha", strategy: "grid", token: "SOL", running: false, fills: 0, pnl: 0, seed: 42 },
  { id: "bot-mr", name: "MeanRev Beta", strategy: "mean-reversion", token: "ETH", running: false, fills: 0, pnl: 0, seed: 77 },
  { id: "bot-mom", name: "Momentum Gamma", strategy: "momentum", token: "BTC", running: false, fills: 0, pnl: 0, seed: 13 },
];

const DEFAULT_POSITIONS: Position[] = [
  { id: "p1", token: "SOL", bought: 142.5, sold: 0, remaining: 2.4, pnlPct: 12.4, openedAgo: "3h" },
  { id: "p2", token: "ETH", bought: 2480, sold: 2510, remaining: 0.35, pnlPct: -2.1, openedAgo: "17h" },
  { id: "p3", token: "JUP", bought: 0.82, sold: 0, remaining: 420, pnlPct: 48.2, openedAgo: "2d" },
  { id: "p4", token: "WIF", bought: 1.12, sold: 0.95, remaining: 90, pnlPct: -14.8, openedAgo: "5h" },
];

const DEFAULT_AGENTS: AgentState[] = [
  { id: "scout", name: "Scout", role: "Ищет импульс и объём", active: true, lastSignal: "Ожидание тика…" },
  { id: "risk", name: "Risk", role: "Контроль просадки и размера", active: true, lastSignal: "Риск в норме" },
  { id: "sentiment", name: "Sentiment", role: "Краткий рыночный комментарий", active: false, lastSignal: "Выключен" },
];

export function defaultTerminalState(): TerminalState {
  return {
    totalValue: 34.45,
    unrealized: 14.62,
    realized: 8.4,
    tradeable: 12.1,
    bots: DEFAULT_BOTS,
    positions: DEFAULT_POSITIONS,
    activity: [
      { id: "a1", type: "Buy", token: "SOL", amount: 0.4, mcap: "$62.1B", age: "12s", ts: Date.now() - 12000 },
      { id: "a2", type: "Sell", token: "WIF", amount: 25, mcap: "$410M", age: "48s", ts: Date.now() - 48000 },
      { id: "a3", type: "Buy", token: "JUP", amount: 80, mcap: "$1.2B", age: "2m", ts: Date.now() - 120000 },
    ],
    agents: DEFAULT_AGENTS,
    range: "1d",
  };
}

export function loadTerminalState(): TerminalState {
  if (typeof window === "undefined") return defaultTerminalState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultTerminalState();
    const parsed = JSON.parse(raw) as Partial<TerminalState>;
    const base = defaultTerminalState();
    return {
      ...base,
      ...parsed,
      bots: parsed.bots?.length ? parsed.bots : base.bots,
      positions: parsed.positions?.length ? parsed.positions : base.positions,
      activity: parsed.activity?.length ? parsed.activity : base.activity,
      agents: parsed.agents?.length ? parsed.agents : base.agents,
    };
  } catch {
    return defaultTerminalState();
  }
}

export function saveTerminalState(state: TerminalState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

const CHAT_KEY = "jarvis-chat-v1";

export function loadChat(): { role: string; content: string; intent?: string | null; mood?: string | null }[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    return raw ? (JSON.parse(raw) as { role: string; content: string; intent?: string | null; mood?: string | null }[]) : [];
  } catch {
    return [];
  }
}

export function saveChat(messages: { role: string; content: string; intent?: string | null; mood?: string | null }[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_KEY, JSON.stringify(messages.slice(-200)));
  } catch {
    /* ignore */
  }
}

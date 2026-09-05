"use client";

// Thin TypeScript wrapper around the Rust/WebAssembly "brain" of Jarvis.
// The actual .wasm + glue JS live in /public/wasm/jarvis-core (built from
// rust/jarvis-core via `wasm-pack build --target web`). We load them with a
// fully dynamic import (non-literal specifier) so bundlers treat this as a
// runtime-only browser fetch instead of trying to statically resolve it.

export interface JarvisReply {
  reply: string;
  intent: string;
  mood: string;
  turn: number;
}

export interface MarketTick {
  price: number;
  prev: number;
  changePct: number;
  volume: number;
  pnl: number;
  unrealized: number;
  t: number;
}

export interface BotSignal {
  side: "buy" | "sell" | string;
  confidence: number;
  strategy: string;
  tick: MarketTick;
}

interface WasmEngineInstance {
  process(input: string, timeStr: string, dateStr: string): string;
  reset(): void;
}

interface WasmModule {
  JarvisEngine: new () => WasmEngineInstance;
  engine_version: () => string;
  evaluate_math: (expr: string) => number | undefined;
  tick_market: (seed: number, t: number) => string;
  generate_sparkline: (seed: number, n: number, t: number) => string;
  generate_waveform: (seed: number, n: number, t: number, mode: string) => string;
  pulse_meter: (seed: number, t: number) => number;
  bot_signal: (seed: number, strategy: string, t: number) => string;
  default: (input?: unknown) => Promise<unknown>;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";
const WASM_JS_PATH = `${BASE}/wasm/jarvis-core/jarvis_core.js`;

let modulePromise: Promise<WasmModule> | null = null;

async function loadModule(): Promise<WasmModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      const specifier = WASM_JS_PATH;
      const mod = (await import(/* webpackIgnore: true */ specifier)) as WasmModule;
      await mod.default();
      return mod;
    })();
  }
  return modulePromise;
}

function parseJsonArray(raw: string): number[] {
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as number[]) : [];
  } catch {
    return [];
  }
}

export async function getEngineVersion(): Promise<string> {
  const mod = await loadModule();
  return mod.engine_version();
}

export async function getWasmModule(): Promise<WasmModule> {
  return loadModule();
}

export function tickMarket(mod: WasmModule, seed: number, t: number): MarketTick {
  return JSON.parse(mod.tick_market(seed >>> 0, t)) as MarketTick;
}

export function generateSparkline(mod: WasmModule, seed: number, n: number, t: number): number[] {
  return parseJsonArray(mod.generate_sparkline(seed >>> 0, n >>> 0, t));
}

export function generateWaveform(
  mod: WasmModule,
  seed: number,
  n: number,
  t: number,
  mode: "price" | "volume" | "pnl" | string,
): number[] {
  return parseJsonArray(mod.generate_waveform(seed >>> 0, n >>> 0, t, mode));
}

export function pulseMeter(mod: WasmModule, seed: number, t: number): number {
  return mod.pulse_meter(seed >>> 0, t);
}

export function botSignal(mod: WasmModule, seed: number, strategy: string, t: number): BotSignal {
  return JSON.parse(mod.bot_signal(seed >>> 0, strategy, t)) as BotSignal;
}

export interface JarvisEngineHandle {
  process(input: string): JarvisReply;
  reset(): void;
}

export async function createJarvisEngine(): Promise<JarvisEngineHandle> {
  const mod = await loadModule();
  const engine = new mod.JarvisEngine();

  return {
    process(input: string): JarvisReply {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const dateStr = now.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
        weekday: "long",
      });
      const json = engine.process(input, timeStr, dateStr);
      return JSON.parse(json) as JarvisReply;
    },
    reset() {
      engine.reset();
    },
  };
}

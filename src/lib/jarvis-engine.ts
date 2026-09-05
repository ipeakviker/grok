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

interface WasmEngineInstance {
  process(input: string, timeStr: string, dateStr: string): string;
  reset(): void;
}

interface WasmModule {
  JarvisEngine: new () => WasmEngineInstance;
  engine_version: () => string;
  evaluate_math: (expr: string) => number | undefined;
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

export async function getEngineVersion(): Promise<string> {
  const mod = await loadModule();
  return mod.engine_version();
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

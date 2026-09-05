/* tslint:disable */
/* eslint-disable */

export class JarvisEngine {
    free(): void;
    [Symbol.dispose](): void;
    constructor();
    /**
     * Main entry point. `time_str` / `date_str` are locale-formatted strings
     * produced by JS `Date` (Rust/WASM has no OS clock of its own), everything
     * else — understanding the request and composing the answer — happens here.
     */
    process(input: string, time_str: string, date_str: string): string;
    reset(): void;
}

/**
 * Version string exposed to the UI so we can prove this really is Rust code.
 */
export function engine_version(): string;

/**
 * Standalone helper kept for convenience / potential future CLI reuse.
 */
export function evaluate_math(expr: string): number | undefined;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_jarvisengine_free: (a: number, b: number) => void;
    readonly engine_version: () => [number, number];
    readonly evaluate_math: (a: number, b: number) => [number, number];
    readonly jarvisengine_new: () => number;
    readonly jarvisengine_process: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly jarvisengine_reset: (a: number) => void;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;

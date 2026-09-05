"use client";

import HudPanel from "@/components/HudPanel";
import CommandChatPanel, { type ChatMessage } from "@/components/CommandChatPanel";
import CommandTerminalPanel from "@/components/CommandTerminalPanel";
import AgentsPanel from "@/components/terminal/AgentsPanel";
import BotsPanel from "@/components/terminal/BotsPanel";
import { useCommandCenter } from "@/lib/use-command-center";

export type { ChatMessage };

export default function JarvisApp({ initialMessages }: { initialMessages: ChatMessage[] }) {
  const cc = useCommandCenter(initialMessages);
  const state = cc.terminal.state;

  return (
    <main className="jt-root jt-command flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-slate-100">
      <header className="jt-topnav z-30 flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800/80 bg-black/80 px-3 py-2 backdrop-blur">
        <div className="font-mono text-xs tracking-[0.28em] text-cyan-300">J.A.R.V.I.S.</div>
        <span className="jt-badge">COMMAND CENTER</span>
        <span className="hidden font-mono text-[10px] text-slate-600 sm:inline">JARVIS TERMINAL · ONE SCREEN</span>
        <div className={`ml-auto font-mono text-[10px] ${cc.engineStatus === "error" ? "text-rose-400" : "text-slate-500"}`}>
          {cc.statusLabel}
        </div>
      </header>

      <div className="jt-voicebar z-40 flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-800/80 bg-[#07090c]/95 px-3 py-2 backdrop-blur">
        <button
          type="button"
          onClick={cc.toggleListening}
          disabled={!cc.voiceSupported || cc.engineStatus === "loading"}
          className={`min-h-11 min-w-[9.5rem] rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition disabled:cursor-not-allowed disabled:opacity-40 ${
            cc.listening ? "bg-rose-500 text-white hover:bg-rose-400" : "bg-cyan-500 text-slate-950 hover:bg-cyan-400"
          }`}
        >
          {cc.listening ? "⏹ Стоп" : "🎙️ Микрофон"}
        </button>
        <button
          type="button"
          onClick={() => cc.setTtsEnabled((v) => !v)}
          className={`min-h-11 rounded-full border px-4 py-2.5 text-sm font-medium transition ${
            cc.ttsEnabled ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200" : "border-slate-700 bg-slate-900/60 text-slate-400"
          }`}
        >
          {cc.ttsEnabled ? "🔊 TTS" : "🔇 TTS"}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[11px] text-slate-500">
          <span className={`jt-dot ${cc.listening ? "jt-dot-live" : ""}`} />
          <span className="truncate">
            {cc.listening
              ? "Слушаю…"
              : cc.voiceSupported
                ? "Голос всегда доступен · «запусти бота» / «останови ботов»"
                : "Web Speech недоступен — используйте текстовый ввод"}
          </span>
        </div>
        {cc.anyExpanded && (
          <button
            type="button"
            onClick={() => cc.setExpanded(null)}
            className="min-h-11 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 hover:border-cyan-500/50 hover:text-cyan-200"
          >
            ⟵ К сетке
          </button>
        )}
      </div>

      <div className={`jt-hud-grid relative min-h-0 flex-1 p-2 sm:p-3 ${cc.anyExpanded ? "jt-hud-grid--expanded" : ""}`}>
        <HudPanel
          id="chat"
          title="Jarvis · Chat"
          subtitle="Орб · голос · диалог"
          expanded={cc.expanded === "chat"}
          anyExpanded={cc.anyExpanded}
          onExpand={() => cc.setExpanded("chat")}
          onCollapse={() => cc.setExpanded(null)}
          className="jt-hud-slot jt-hud-slot--chat"
        >
          <CommandChatPanel
            chat={cc.chat}
            mood={cc.mood}
            orbClasses={cc.orbClasses}
            orb={cc.orb}
            input={cc.input}
            setInput={cc.setInput}
            onSubmit={cc.onSubmit}
            engineStatus={cc.engineStatus}
            clearHistory={cc.clearHistory}
            scrollRef={cc.scrollRef}
          />
        </HudPanel>

        <HudPanel
          id="terminal"
          title="Trading Terminal"
          subtitle="WASM charts · KPI · positions"
          expanded={cc.expanded === "terminal"}
          anyExpanded={cc.anyExpanded}
          onExpand={() => cc.setExpanded("terminal")}
          onCollapse={() => cc.setExpanded(null)}
          className="jt-hud-slot jt-hud-slot--terminal"
          bodyClassName="!overflow-auto"
        >
          <CommandTerminalPanel state={state} pulse={cc.terminal.pulse} expanded={cc.expanded === "terminal"} />
        </HudPanel>

        <HudPanel
          id="bots"
          title="Bots"
          subtitle="Симуляция · localStorage"
          expanded={cc.expanded === "bots"}
          anyExpanded={cc.anyExpanded}
          onExpand={() => cc.setExpanded("bots")}
          onCollapse={() => cc.setExpanded(null)}
          className="jt-hud-slot jt-hud-slot--bots"
        >
          <div className="p-3">
            {state ? <BotsPanel bots={state.bots} onToggle={cc.terminal.toggleBot} /> : <p className="text-sm text-slate-500">Загрузка…</p>}
          </div>
        </HudPanel>

        <HudPanel
          id="agents"
          title="AI Agents"
          subtitle="JarvisEngine · market commentary"
          expanded={cc.expanded === "agents"}
          anyExpanded={cc.anyExpanded}
          onExpand={() => cc.setExpanded("agents")}
          onCollapse={() => cc.setExpanded(null)}
          className="jt-hud-slot jt-hud-slot--agents"
        >
          <div className="p-3">
            {state ? (
              <AgentsPanel
                agents={state.agents}
                onToggle={cc.terminal.toggleAgent}
                onAsk={cc.terminal.askAgent}
                busy={cc.terminal.agentBusy}
              />
            ) : (
              <p className="text-sm text-slate-500">Загрузка…</p>
            )}
          </div>
        </HudPanel>
      </div>

      <footer className="jt-footer z-20 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5">
        <span className="text-cyan-400/80">J.A.R.V.I.S.</span>
        <span>BTC ${cc.terminal.btc.toFixed(0)}</span>
        <span>ETH ${cc.terminal.eth.toFixed(0)}</span>
        <span className="jt-dot jt-dot-live" />
        <span>LIVE</span>
        {state && (
          <span className="text-slate-600">
            bots {state.bots.filter((b) => b.running).length}/{state.bots.length}
          </span>
        )}
        <span className="ml-auto">{cc.terminal.clock}</span>
      </footer>
    </main>
  );
}

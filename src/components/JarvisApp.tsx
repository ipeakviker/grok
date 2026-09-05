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
  const botsLive = state ? state.bots.filter((b) => b.running).length : 0;
  const agentsOn = state ? state.agents.filter((a) => a.active).length : 0;

  return (
    <main className="jt-root jt-command flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden text-slate-100">
      <header className="jt-topnav z-30 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-4">
        <div className="jt-mark">
          <div className="jt-mark__glyph">J</div>
          <div>
            <div className="jt-mark__title">J.A.R.V.I.S.</div>
            <div className="jt-mark__sub">Command Center</div>
          </div>
        </div>

        <span className="jt-badge jt-badge--live">
          <span className="jt-dot jt-dot-live" />
          LIVE
        </span>
        <span className="jt-badge hidden sm:inline-flex">HUD · DESK</span>

        <div className="jt-health ml-auto hidden md:flex">
          <span className="jt-health__item">
            <span className={`jt-dot ${cc.engineStatus === "ready" ? "jt-dot-cyan" : ""}`} />
            {cc.statusLabel}
          </span>
          <span className="jt-footer__sep" />
          <span className="jt-health__item">
            BOTS {botsLive}/{state?.bots.length ?? 0}
          </span>
          <span className="jt-footer__sep" />
          <span className="jt-health__item">
            AGENTS {agentsOn}/{state?.agents.length ?? 0}
          </span>
        </div>

        <div
          className={`font-mono text-[10px] md:hidden ${
            cc.engineStatus === "error" ? "text-rose-400" : "text-slate-500"
          }`}
        >
          {cc.statusLabel}
        </div>
        <time className="jt-clock tabular-nums" dateTime={cc.terminal.clock}>
          {cc.terminal.clock}
        </time>
      </header>

      <div className="jt-voicebar z-40 flex shrink-0 flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={cc.toggleListening}
          disabled={!cc.voiceSupported || cc.engineStatus === "loading"}
          className={`jt-voice-btn ${cc.listening ? "jt-voice-btn--stop" : "jt-voice-btn--mic"}`}
        >
          {cc.listening ? "⏹ Стоп" : "🎙️ Микрофон"}
        </button>
        <button
          type="button"
          onClick={() => cc.setTtsEnabled((v) => !v)}
          className={`jt-pill-btn ${cc.ttsEnabled ? "jt-pill-btn--on" : ""}`}
        >
          {cc.ttsEnabled ? "🔊 TTS" : "🔇 TTS"}
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[11px] text-slate-500">
          <span className={`jt-dot ${cc.listening ? "jt-dot-live" : "jt-dot-cyan"}`} />
          <span className="truncate">
            {cc.listening
              ? "Слушаю команду…"
              : cc.voiceSupported
                ? "Голос всегда доступен · «запусти бота» / «останови ботов»"
                : "Web Speech недоступен — используйте текстовый ввод"}
          </span>
        </div>
        {cc.anyExpanded && (
          <div className="flex items-center gap-2">
            <span className="jt-esc-hint hidden sm:inline">
              <kbd>Esc</kbd> свернуть
            </span>
            <button
              type="button"
              onClick={() => cc.setExpanded(null)}
              className="jt-pill-btn min-h-11 text-xs font-semibold uppercase tracking-wider"
            >
              ⟵ К сетке
            </button>
          </div>
        )}
      </div>

      <div className={`jt-hud-grid relative min-h-0 flex-1 p-2 sm:p-3 ${cc.anyExpanded ? "jt-hud-grid--expanded" : ""}`}>
        <HudPanel
          id="chat"
          title="Jarvis · Chat"
          subtitle="Орб · голос · диалог"
          status={cc.listening ? "live" : cc.engineStatus === "ready" ? "idle" : "warn"}
          statusLabel={cc.listening ? "LISTENING" : cc.engineStatus === "ready" ? "ONLINE" : "BOOT"}
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
          title="Trading Desk"
          subtitle="WASM · KPI · positions"
          status="live"
          statusLabel="MARKET"
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
          status={botsLive > 0 ? "live" : "idle"}
          statusLabel={botsLive > 0 ? `${botsLive} RUNNING` : "IDLE"}
          expanded={cc.expanded === "bots"}
          anyExpanded={cc.anyExpanded}
          onExpand={() => cc.setExpanded("bots")}
          onCollapse={() => cc.setExpanded(null)}
          className="jt-hud-slot jt-hud-slot--bots"
        >
          <div className="p-3">
            {state ? (
              <BotsPanel bots={state.bots} onToggle={cc.terminal.toggleBot} />
            ) : (
              <div className="jt-empty">
                <div className="jt-empty__icon">···</div>
                <p>Загрузка ботов…</p>
                <div className="jt-skeleton mt-2 h-16 w-full max-w-xs" />
              </div>
            )}
          </div>
        </HudPanel>

        <HudPanel
          id="agents"
          title="AI Agents"
          subtitle="JarvisEngine · market commentary"
          status={agentsOn > 0 ? "live" : "idle"}
          statusLabel={agentsOn > 0 ? `${agentsOn} ACTIVE` : "STANDBY"}
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
              <div className="jt-empty">
                <div className="jt-empty__icon">AI</div>
                <p>Загрузка агентов…</p>
              </div>
            )}
          </div>
        </HudPanel>
      </div>

      <footer className="jt-footer z-20 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 sm:px-4">
        <span className="jt-cyan">J.A.R.V.I.S.</span>
        <span className="jt-footer__sep" />
        <span className="jt-num">BTC ${cc.terminal.btc.toFixed(0)}</span>
        <span className="jt-num">ETH ${cc.terminal.eth.toFixed(0)}</span>
        <span className="jt-footer__sep" />
        <span className="jt-badge jt-badge--live">
          <span className="jt-dot jt-dot-live" />
          LIVE
        </span>
        {state && (
          <span className="text-slate-600">
            bots {botsLive}/{state.bots.length} · agents {agentsOn}/{state.agents.length}
          </span>
        )}
        {state && (
          <>
            <span className="jt-footer__sep hidden sm:block" />
            <span className={`jt-num hidden sm:inline ${state.unrealized >= 0 ? "jt-green" : "jt-red"}`}>
              uPnL {state.unrealized >= 0 ? "+" : ""}${state.unrealized.toFixed(2)}
            </span>
          </>
        )}
        <span className="jt-clock ml-auto">{cc.terminal.clock}</span>
      </footer>
    </main>
  );
}

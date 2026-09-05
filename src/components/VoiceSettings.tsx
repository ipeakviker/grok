"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getOpenAiKey,
  getTtsVoice,
  setOpenAiKey,
  setTtsVoice,
  speak,
  speakBrowser,
  type OpenAiTtsVoice,
  createWhisperSession,
} from "@/lib/voice-utils";

type Props = {
  open: boolean;
  onClose: () => void;
  onKeyChange?: (hasKey: boolean) => void;
};

export default function VoiceSettings({ open, onClose, onKeyChange }: Props) {
  const [keyInput, setKeyInput] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [voice, setVoice] = useState<OpenAiTtsVoice>("nova");
  const [status, setStatus] = useState("");
  const [testingMic, setTestingMic] = useState(false);

  useEffect(() => {
    if (!open) return;
    const k = getOpenAiKey();
    setHasKey(!!k);
    setKeyInput(k ? "••••••••••••" : "");
    setVoice(getTtsVoice());
    setStatus("");
  }, [open]);

  const saveKey = useCallback(() => {
    const raw = keyInput.trim();
    if (!raw || raw.startsWith("••")) {
      setStatus(hasKey ? "Ключ уже сохранён в браузере." : "Вставьте ключ OpenAI.");
      return;
    }
    setOpenAiKey(raw);
    setHasKey(true);
    setKeyInput("••••••••••••");
    onKeyChange?.(true);
    setStatus("Ключ сохранён только в localStorage этого браузера.");
  }, [keyInput, hasKey, onKeyChange]);

  const clearKey = useCallback(() => {
    setOpenAiKey(null);
    setHasKey(false);
    setKeyInput("");
    onKeyChange?.(false);
    setStatus("Ключ удалён из браузера.");
  }, [onKeyChange]);

  const testSpeak = useCallback(async () => {
    setStatus("Произношу тест…");
    try {
      await speak("RUSTaman на связи. Голосовой канал готов.");
      setStatus(hasKey ? "OpenAI TTS OK (nova/onyx)." : "Web Speech TTS OK.");
    } catch (e) {
      setStatus(`TTS ошибка: ${e instanceof Error ? e.message : String(e)}`);
      speakBrowser("Резервный голос браузера.");
    }
  }, [hasKey]);

  const testMic = useCallback(async () => {
    if (testingMic) return;
    setTestingMic(true);
    setStatus("Слушаю 4 сек… говорите.");
    try {
      const key = getOpenAiKey();
      if (key) {
        const session = createWhisperSession(key);
        await new Promise((r) => setTimeout(r, 4000));
        const text = await session.stop();
        setStatus(text ? `Whisper: «${text}»` : "Whisper: пустая расшифровка — попробуйте ещё.");
      } else {
        const w = window as unknown as Window;
        const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
        if (!Ctor) {
          setStatus("Web Speech STT недоступен в этом браузере.");
          return;
        }
        const rec = new Ctor();
        rec.lang = "ru-RU";
        rec.interimResults = true;
        rec.continuous = false;
        await new Promise<void>((resolve) => {
          let finalText = "";
          rec.onresult = (ev) => {
            const last = ev.results[ev.results.length - 1];
            const piece = last?.[0]?.transcript || "";
            const isFinal = (last as unknown as { isFinal?: boolean })?.isFinal;
            setStatus(isFinal ? `STT: «${piece}»` : `… ${piece}`);
            if (isFinal) finalText = piece;
          };
          rec.onerror = () => {
            setStatus("STT ошибка / нет разрешения микрофона.");
            resolve();
          };
          rec.onend = () => {
            if (finalText) setStatus(`STT: «${finalText}»`);
            resolve();
          };
          try {
            rec.start();
          } catch {
            setStatus("Не удалось запустить распознавание.");
            resolve();
          }
          window.setTimeout(() => {
            try {
              rec.stop();
            } catch {
              /* ignore */
            }
          }, 5000);
        });
      }
    } catch (e) {
      setStatus(`Микрофон: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setTestingMic(false);
    }
  }, [testingMic]);

  if (!open) return null;

  return (
    <div className="jt-voice-settings fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-3 sm:items-center" role="dialog" aria-modal aria-label="Настройки голоса">
      <div className="jt-hud-panel relative w-full max-w-lg overflow-hidden shadow-2xl">
        <span className="jt-hud-corners" aria-hidden />
        <header className="jt-hud-panel__head flex items-center justify-between gap-2 py-2.5">
          <div>
            <div className="font-mono text-[10px] tracking-[0.24em] text-sky-300 uppercase">Settings · Voice</div>
            <p className="text-[11px] text-slate-500">STT / TTS · ключ только в браузере</p>
          </div>
          <button type="button" className="jt-hud-iconbtn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </header>
        <div className="space-y-4 p-4">
          <p className="rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[12px] leading-relaxed text-amber-100/90">
            OpenAI API key хранится <strong>только в localStorage</strong> этого браузера. Не коммитьте ключ. На GitHub
            Pages нет серверных секретов — запросы идут напрямую из браузера к OpenAI.
          </p>

          <label className="block space-y-1.5">
            <span className="jt-label">OpenAI API key</span>
            <input
              type="password"
              autoComplete="off"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onFocus={() => {
                if (keyInput.startsWith("••")) setKeyInput("");
              }}
              placeholder="sk-…"
              className="w-full rounded-lg border border-slate-700/80 bg-slate-950/80 px-3 py-2.5 font-mono text-sm text-slate-100 outline-none focus:border-sky-500/50"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="jt-voice-btn jt-voice-btn--mic !min-w-0 !px-4 text-sm" onClick={saveKey}>
              Сохранить ключ
            </button>
            <button type="button" className="jt-pill-btn" onClick={clearKey} disabled={!hasKey}>
              Очистить ключ
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="jt-label">TTS voice</span>
            {(["nova", "onyx"] as const).map((v) => (
              <button
                key={v}
                type="button"
                className={`jt-pill-btn ${voice === v ? "jt-pill-btn--on" : ""}`}
                onClick={() => {
                  setVoice(v);
                  setTtsVoice(v);
                }}
              >
                {v}
              </button>
            ))}
            <span className="font-mono text-[10px] text-slate-600">
              {hasKey ? "режим: Whisper + OpenAI TTS" : "режим: Web Speech (без ключа)"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className="jt-pill-btn" onClick={() => void testMic()} disabled={testingMic}>
              {testingMic ? "…" : "🎙️ Тест микрофона"}
            </button>
            <button type="button" className="jt-pill-btn" onClick={() => void testSpeak()}>
              🔊 Тест речи
            </button>
          </div>

          {status ? <p className="font-mono text-[11px] leading-relaxed text-sky-200/90">{status}</p> : null}
        </div>
      </div>
    </div>
  );
}

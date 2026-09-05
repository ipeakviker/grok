"use client";

export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "ru-RU";
  utter.rate = 1.02;
  utter.pitch = 0.9;
  const voices = window.speechSynthesis.getVoices();
  const ruVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("ru"));
  if (ruVoice) utter.voice = ruVoice;
  window.speechSynthesis.speak(utter);
}

/** Voice shortcuts for bots — returns Jarvis reply if handled, else null. */
export function matchBotVoiceCommand(
  text: string,
  setBotsRunning: (running: boolean, match?: string) => string,
): string | null {
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();
  const start =
    /^(запусти|запустить|старт|включи|включить|start)\s+(всех\s+)?(бота|ботов|бот|bots?)(\s+(.+))?$/.exec(t) ||
    /^(запусти|старт|включи)\s+(grid|mean|momentum|alpha|beta|gamma|btc|eth|sol)/.exec(t);
  const stop =
    /^(останови|остановить|стоп|выключи|выключить|stop)\s+(всех\s+)?(бота|ботов|бот|bots?)(\s+(.+))?$/.exec(t) ||
    /^(останови|стоп|выключи)\s+(grid|mean|momentum|alpha|beta|gamma|btc|eth|sol)/.exec(t);

  if (start) {
    const match = (start[5] || start[2] || "").trim() || undefined;
    const all = /всех/.test(t) || !match;
    return setBotsRunning(true, all ? undefined : match);
  }
  if (stop) {
    const match = (stop[5] || stop[2] || "").trim() || undefined;
    const all = /всех/.test(t) || !match;
    return setBotsRunning(false, all ? undefined : match);
  }
  return null;
}

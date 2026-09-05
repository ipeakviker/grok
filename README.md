# J.A.R.V.I.S. · grok

Next.js static site + Rust/WebAssembly assistant, deployed to GitHub Pages.

**Live:** https://ipeakviker.github.io/grok/

## Features

- **Command Center (HUD)** — chat + trading + bots + agents + **RUSTaman**
- **Expandable panels** — fullscreen any panel (`Esc` to collapse)
- **Voice bar** — Web Speech fallback or optional OpenAI Whisper+TTS
- **RUSTaman** — operator assistant, live telemetry, architecture, snapshot copy
- **Dashboard NLU** — status / portfolio / bots / agents from live sim
- **Voice bot control** — start/stop bots by voice

## Voice · OpenAI key (optional)

1. Open HUD → **Voice** in the voice bar.
2. Paste OpenAI API key → save.
3. Test mic / test speak.
4. Key lives only in browser localStorage (`jarvis-openai-key`) — never commit it.

Without a key: improved Web Speech (interim transcript, continuous loop, RU voice).
With a key: Whisper STT (whisper-1, ru) + OpenAI TTS (tts-1, nova/onyx).

Privacy: key and audio stay in the browser; API calls go browser → OpenAI only.

## RUSTaman

Fifth panel — operator assistant: live KPIs, architecture map, app-aware chat, snapshot JSON for Grok Bot.

## Develop
Build WASM, install deps, start the Next.js app. Static GitHub Pages export.

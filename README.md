# J.A.R.V.I.S. · grok

Next.js static site + Rust/WebAssembly assistant, deployed to GitHub Pages.

**Live:** https://ipeakviker.github.io/grok/

## Features

- **Command Center (HUD)** — one full-viewport screen: chat + trading terminal + bots + agents together (no tab switching)
- **Expandable panels** — fullscreen any panel, then collapse back to the grid
- **Always-on voice bar** — mic + TTS stay reachable even in fullscreen (Web Speech API)
- **JARVIS TERMINAL** — dark pro-trader demo (WASM sparklines / waveforms, localStorage sim)
- **Voice bot control** — «запусти бота» / «останови ботов»

## Develop

```bash
npm run wasm:build
npm install
npm run dev
```

GitHub Pages build sets NEXT_PUBLIC_BASE_PATH=/grok and output export.
No server API routes — chat and terminal state persist in localStorage.

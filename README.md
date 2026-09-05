# J.A.R.V.I.S. · grok

Next.js static site + Rust/WebAssembly assistant, deployed to GitHub Pages.

**Live:** https://ipeakviker.github.io/grok/

## Features

- **Chat** — voice/text assistant (Rust intent engine in WASM)
- **JARVIS TERMINAL** — dark pro-trader style demo portfolio (WASM sparklines / waveforms)
- **Bots** — start/stop simulated grid / mean-reversion / momentum bots (localStorage)
- **Agents** — Scout / Risk / Sentiment call JarvisEngine.process for market commentary

## Develop

```bash
npm run wasm:build
npm install
npm run dev
```

GitHub Pages build sets NEXT_PUBLIC_BASE_PATH=/grok and output export.
No server API routes — chat and terminal state persist in localStorage.

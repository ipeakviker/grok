# grok — J.A.R.V.I.S.

Next.js frontend + Rust/WebAssembly brain.

## Live (GitHub Pages)

https://ipeakviker.github.io/grok/

Static export only: chat UI + in-browser WASM. No Postgres / API on Pages.

## Local

```bash
npm install
# optional: rebuild wasm
npm run wasm:build
NEXT_PUBLIC_BASE_PATH= npm run dev
```

For a Pages-like build:

```bash
npm run wasm:build
NEXT_PUBLIC_BASE_PATH=/grok npm run build
# static files in out/
```

## Deploy

Push to `main` runs `.github/workflows/deploy-pages.yml` (builds WASM, `next export`, deploys Pages).

One-time: **Settings → Pages → Source: GitHub Actions**.

## Stack

- Next.js 16 (static `output: 'export'` for Pages)
- Rust `jarvis-core` → WASM
- Optional server pieces (`src/db`, Drizzle) are for a full Node host, not Pages.

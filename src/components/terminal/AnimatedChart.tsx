"use client";

import { useEffect, useRef } from "react";
import { generateWaveform, getWasmModule } from "@/lib/jarvis-engine";

type Props = {
  seed?: number;
  mode?: "price" | "volume" | "pnl";
  title?: string;
  accent?: string;
};

export default function AnimatedChart({
  seed = 21,
  mode = "price",
  title = "REALIZED PNL / PRICE WAVE",
  accent = "#22d3ee",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const t0 = useRef(performance.now());

  useEffect(() => {
    let cancelled = false;
    let mod: Awaited<ReturnType<typeof getWasmModule>> | null = null;

    (async () => {
      try {
        mod = await getWasmModule();
      } catch {
        return;
      }
      if (cancelled || !mod) return;

      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const resize = () => {
        const rect = wrap.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(100, rect.width) * dpr;
        canvas.height = Math.max(80, rect.height) * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      const draw = (now: number) => {
        if (cancelled || !mod) return;
        const w = wrap.getBoundingClientRect().width;
        const h = wrap.getBoundingClientRect().height;
        const t = (now - t0.current) / 1000;
        const pts = generateWaveform(mod, seed, Math.min(220, Math.floor(w / 2)), t, mode);

        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = "rgba(148,163,184,0.08)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          const y = (i / 5) * h;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        for (let i = 0; i < 10; i++) {
          const x = (i / 9) * w;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }

        if (pts.length >= 2) {
          const path = new Path2D();
          pts.forEach((v, i) => {
            const x = (i / (pts.length - 1)) * w;
            const y = h - v * (h * 0.82) - h * 0.08;
            if (i === 0) path.moveTo(x, y);
            else path.lineTo(x, y);
          });

          const fill = new Path2D(path);
          fill.lineTo(w, h);
          fill.lineTo(0, h);
          fill.closePath();
          const grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, accent + "55");
          grad.addColorStop(1, accent + "00");
          ctx.fillStyle = grad;
          ctx.fill(fill);

          ctx.strokeStyle = accent;
          ctx.lineWidth = 2;
          ctx.shadowColor = accent;
          ctx.shadowBlur = 10;
          ctx.stroke(path);
          ctx.shadowBlur = 0;
        }

        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);

      return () => ro.disconnect();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [seed, mode, accent]);

  return (
    <div className="jt-panel flex h-full min-h-[160px] flex-col">
      <div className="jt-panel-title flex items-center justify-between">
        <span>{title}</span>
        <span className="jt-badge">WASM · rAF</span>
      </div>
      <div ref={wrapRef} className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { generateSparkline, getWasmModule } from "@/lib/jarvis-engine";

type Props = {
  seed?: number;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
};

export default function Sparkline({
  seed = 1,
  width = 120,
  height = 32,
  color = "#22c55e",
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number>(0);
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
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const draw = (now: number) => {
        if (cancelled || !mod) return;
        const t = (now - t0.current) / 1000;
        const pts = generateSparkline(mod, seed, 48, t);
        ctx.clearRect(0, 0, width, height);
        if (pts.length < 2) {
          rafRef.current = requestAnimationFrame(draw);
          return;
        }
        ctx.beginPath();
        pts.forEach((v, i) => {
          const x = (i / (pts.length - 1)) * width;
          const y = height - v * (height - 4) - 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
        rafRef.current = requestAnimationFrame(draw);
      };
      rafRef.current = requestAnimationFrame(draw);
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [seed, width, height, color]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={`block ${className}`}
      aria-hidden
    />
  );
}

"use client";

import React, { useEffect, useRef } from "react";

interface MicVisualizerProps {
  volume: number;
  isListening: boolean;
  isActive: boolean;
}

export default function MicVisualizer({ volume, isListening, isActive }: MicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const barsRef = useRef<number[]>(Array(20).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bars = barsRef.current;
    const numBars = bars.length;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // 배경
      const gradient = ctx.createLinearGradient(0, 0, W, 0);
      gradient.addColorStop(0, "rgba(124, 58, 237, 0.1)");
      gradient.addColorStop(0.5, "rgba(59, 130, 246, 0.1)");
      gradient.addColorStop(1, "rgba(124, 58, 237, 0.1)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // 바 업데이트
      const targetHeight = isListening && isActive ? volume * H * 3 : 0;
      for (let i = 0; i < numBars; i++) {
        const noise = Math.random() * 0.3 + 0.7;
        const target =
          isListening && isActive
            ? Math.min(H, targetHeight * noise * (0.5 + Math.random() * 0.5))
            : 2;
        bars[i] = bars[i] * 0.7 + target * 0.3;
      }

      const barW = W / numBars;

      for (let i = 0; i < numBars; i++) {
        const h = Math.max(2, bars[i]);
        const x = i * barW + 1;
        const y = (H - h) / 2;

        const barGradient = ctx.createLinearGradient(x, y, x, y + h);
        if (isActive && isListening) {
          barGradient.addColorStop(0, "#a78bfa");
          barGradient.addColorStop(0.5, "#60a5fa");
          barGradient.addColorStop(1, "#a78bfa");
        } else {
          barGradient.addColorStop(0, "#4b5563");
          barGradient.addColorStop(1, "#374151");
        }

        ctx.fillStyle = barGradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barW - 2, h, 3);
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [volume, isListening, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className="w-full h-full rounded-2xl"
    />
  );
}

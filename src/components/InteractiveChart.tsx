import React, { useEffect, useRef } from 'react';
import { MarketAsset } from '../types';

interface InteractiveChartProps {
  asset: MarketAsset;
}

export function InteractiveChart({ asset }: InteractiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    // Grid lines (adaptive to light/dark background)
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i + 20;
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const isPositive = asset.change >= 0;
    const points: number[] = [];
    let currentY = h * 0.5;
    const pointCount = 80;

    for (let i = 0; i < pointCount; i++) {
      currentY += (Math.random() - (isPositive ? 0.42 : 0.58)) * (h * 0.04);
      currentY = Math.max(h * 0.1, Math.min(h * 0.9, currentY));
      points.push(currentY);
    }

    const lastY = points[points.length - 1];

    ctx.beginPath();
    ctx.strokeStyle = isPositive ? '#16a34a' : '#dc2626';
    ctx.lineWidth = 2.5;

    points.forEach((val, idx) => {
      const x = (idx / (pointCount - 1)) * w;
      if (idx === 0) {
        ctx.moveTo(x, val);
      } else {
        ctx.lineTo(x, val);
      }
    });
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, isPositive ? 'rgba(22, 163, 74, 0.25)' : 'rgba(220, 38, 38, 0.25)');
    gradient.addColorStop(1, 'transparent');

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Live horizontal price line across chart
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = isPositive ? 'rgba(22, 163, 74, 0.6)' : 'rgba(220, 38, 38, 0.6)';
    ctx.lineWidth = 1;
    ctx.moveTo(0, lastY);
    ctx.lineTo(w, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing live price pulse dot at latest quote
    ctx.beginPath();
    ctx.arc(w - 2, lastY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = isPositive ? '#16a34a' : '#dc2626';
    ctx.shadowColor = isPositive ? '#16a34a' : '#dc2626';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [asset]);

  return <canvas ref={canvasRef} className="big-chart" />;
}

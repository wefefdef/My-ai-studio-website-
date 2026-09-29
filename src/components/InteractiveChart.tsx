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

    // Grid lines
    for (let i = 0; i < 5; i++) {
      const y = (h / 5) * i + 20;
      ctx.strokeStyle = '#dce3ed';
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

    ctx.beginPath();
    ctx.strokeStyle = isPositive ? '#16a34a' : '#dc2626';
    ctx.lineWidth = 2;

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
    gradient.addColorStop(0, isPositive ? '#16a34a20' : '#dc262620');
    gradient.addColorStop(1, 'transparent');

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [asset]);

  return <canvas ref={canvasRef} className="big-chart" />;
}

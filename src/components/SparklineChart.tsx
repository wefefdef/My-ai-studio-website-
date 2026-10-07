import { useEffect, useRef } from 'react';

interface SparklineChartProps {
  positive: boolean;
}

export function SparklineChart({ positive }: SparklineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = 120);
    const height = (canvas.height = 40);
    ctx.clearRect(0, 0, width, height);

    const points: number[] = [];
    let currentY = height / 2;
    for (let i = 0; i < 30; i++) {
      currentY += (Math.random() - (positive ? 0.4 : 0.6)) * 4;
      currentY = Math.max(4, Math.min(height - 4, currentY));
      points.push(currentY);
    }

    ctx.beginPath();
    ctx.strokeStyle = positive ? '#16a34a' : '#dc2626';
    ctx.lineWidth = 1.5;

    points.forEach((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      if (idx === 0) {
        ctx.moveTo(x, val);
      } else {
        ctx.lineTo(x, val);
      }
    });
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, positive ? '#16a34a18' : '#dc262618');
    gradient.addColorStop(1, 'transparent');

    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [positive]);

  return <canvas ref={canvasRef} className="mini-chart" />;
}

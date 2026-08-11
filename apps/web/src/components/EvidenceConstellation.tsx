import React, { useEffect, useRef } from 'react';

interface ConstellationNode {
  id: string;
  label: string;
  x: number;
  y: number;
  color: string;
  type: 'decide' | 'build' | 'debug' | 'ship';
}

const NODES: ConstellationNode[] = [
  { id: 'n1', label: 'DECIDE', x: 0.55, y: 0.18, color: '#8B5CFF', type: 'decide' },
  { id: 'n2', label: 'BUILD', x: 0.92, y: 0.22, color: '#45F3FF', type: 'build' },
  { id: 'n3', label: 'DEBUG', x: 0.42, y: 0.72, color: '#F59E0B', type: 'debug' },
  { id: 'n4', label: 'SHIP', x: 0.88, y: 0.78, color: '#FF3DA4', type: 'ship' },
  // Secondary background points
  { id: 'p1', label: '', x: 0.25, y: 0.35, color: '#45F3FF', type: 'build' },
  { id: 'p2', label: '', x: 0.4, y: 0.45, color: '#8B5CFF', type: 'decide' },
  { id: 'p3', label: '', x: 0.65, y: 0.35, color: '#45F3FF', type: 'build' },
  { id: 'p4', label: '', x: 0.75, y: 0.55, color: '#FF3DA4', type: 'ship' },
  { id: 'p5', label: '', x: 0.3, y: 0.6, color: '#F59E0B', type: 'debug' },
  { id: 'p6', label: '', x: 0.6, y: 0.65, color: '#8B5CFF', type: 'decide' },
  { id: 'p7', label: '', x: 0.8, y: 0.4, color: '#45F3FF', type: 'build' },
];

const EDGES: [number, number][] = [
  [0, 1],
  [0, 5],
  [0, 6],
  [1, 6],
  [1, 3],
  [2, 4],
  [2, 5],
  [2, 7],
  [3, 6],
  [3, 7],
  [4, 5],
  [5, 6],
  [6, 7],
];

export const EvidenceConstellation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;
    let time = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * window.devicePixelRatio;
        canvas.height = parent.clientHeight * window.devicePixelRatio;
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      time += 0.015;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Calculate node pixel positions with subtle motion
      const points = NODES.map((n, i) => {
        const dx = Math.sin(time + i) * 8;
        const dy = Math.cos(time + i * 1.3) * 8;
        return {
          ...n,
          px: n.x * w + dx,
          py: n.y * h + dy,
        };
      });

      // Draw glowing edges
      EDGES.forEach(([aIdx, bIdx]) => {
        const pA = points[aIdx];
        const pB = points[bIdx];
        if (!pA || !pB) return;

        const grad = ctx.createLinearGradient(pA.px, pA.py, pB.px, pB.py);
        grad.addColorStop(0, pA.color + '66');
        grad.addColorStop(1, pB.color + '66');

        ctx.beginPath();
        ctx.moveTo(pA.px, pA.py);
        ctx.lineTo(pB.px, pB.py);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5 * window.devicePixelRatio;
        ctx.stroke();
      });

      // Draw nodes
      points.forEach((p) => {
        const isMain = p.label.length > 0;
        const r = (isMain ? 6 : 3) * window.devicePixelRatio;

        // Glow ring
        ctx.beginPath();
        ctx.arc(p.px, p.py, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '22';
        ctx.fill();

        // Solid node core
        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Node label box if main
        if (isMain) {
          ctx.font = `${Math.round(10 * window.devicePixelRatio)}px "JetBrains Mono", monospace`;
          ctx.fillStyle = '#F4F1EA';
          ctx.textAlign = 'center';
          ctx.fillText(p.label, p.px, p.py - 12 * window.devicePixelRatio);
        }
      });

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full min-h-[320px] rounded-2xl glass-panel overflow-hidden p-4 flex flex-col justify-between">
      <div className="flex items-center justify-between text-xs text-[#9CAAC1] font-mono-tech z-10">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#45F3FF] animate-ping" />
          EVIDENCE GRAPH
        </span>
        <span className="text-[#45F3FF]">PROVENANCE VERIFIED</span>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      <div className="flex items-center justify-between text-[11px] text-[#9CAAC1] font-mono-tech z-10">
        <span>43 DECISIONS</span>
        <span>62 FIXES</span>
        <span className="text-[#FF3DA4]">27 DESIGNS</span>
      </div>
    </div>
  );
};

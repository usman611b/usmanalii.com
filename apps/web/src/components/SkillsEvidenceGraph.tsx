import React, { useEffect, useRef } from 'react';

interface SkillNode {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  color: string;
  isPrimary?: boolean;
}

const SKILL_NODES: SkillNode[] = [
  { id: 'sd', label: 'System Design', x: 0.42, y: 0.55, r: 18, color: '#45F3FF', isPrimary: true },
  { id: 'be', label: 'Backend Eng', x: 0.72, y: 0.58, r: 14, color: '#8B5CFF', isPrimary: true },
  { id: 'api', label: 'APIs', x: 0.38, y: 0.2, r: 8, color: '#45F3FF' },
  { id: 'scale', label: 'Scalability', x: 0.22, y: 0.32, r: 9, color: '#45F3FF' },
  { id: 'data', label: 'Data Modeling', x: 0.18, y: 0.55, r: 8, color: '#45F3FF' },
  { id: 'rel', label: 'Reliability', x: 0.24, y: 0.78, r: 9, color: '#45F3FF' },
  { id: 'lead', label: 'Leadership', x: 0.88, y: 0.62, r: 10, color: '#FF3DA4' },
  { id: 'ment', label: 'Mentoring', x: 0.88, y: 0.28, r: 7, color: '#FF3DA4' },
  { id: 'hire', label: 'Hiring', x: 0.94, y: 0.46, r: 7, color: '#FF3DA4' },
  { id: 'strat', label: 'Strategy', x: 0.92, y: 0.78, r: 7, color: '#FF3DA4' },
];

const SKILL_EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [0, 4],
  [0, 5],
  [1, 6],
  [1, 7],
  [1, 8],
  [1, 9],
];

export const SkillsEvidenceGraph: React.FC = () => {
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
      time += 0.012;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      const points = SKILL_NODES.map((n, i) => {
        const dx = Math.sin(time + i) * 4;
        const dy = Math.cos(time + i * 1.2) * 4;
        return {
          ...n,
          px: n.x * w + dx,
          py: n.y * h + dy,
        };
      });

      // Draw connections
      SKILL_EDGES.forEach(([aIdx, bIdx]) => {
        const pA = points[aIdx];
        const pB = points[bIdx];
        if (!pA || !pB) return;

        ctx.beginPath();
        ctx.moveTo(pA.px, pA.py);
        ctx.lineTo(pB.px, pB.py);
        ctx.strokeStyle = pA.color + '44';
        ctx.lineWidth = 1.5 * window.devicePixelRatio;
        ctx.stroke();
      });

      // Draw nodes
      points.forEach((p) => {
        const r = p.r * window.devicePixelRatio;

        // Outer glow
        ctx.beginPath();
        ctx.arc(p.px, p.py, r * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '25';
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(p.px, p.py, r, 0, Math.PI * 2);
        ctx.fillStyle = '#070A11';
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * window.devicePixelRatio;
        ctx.fill();
        ctx.stroke();

        // Label
        ctx.font = `${Math.round((p.isPrimary ? 11 : 9) * window.devicePixelRatio)}px "JetBrains Mono", monospace`;
        ctx.fillStyle = '#F4F1EA';
        ctx.textAlign = 'center';
        ctx.fillText(p.label, p.px, p.py + (r + 14 * window.devicePixelRatio));
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
    <div className="relative w-full h-full min-h-[280px] rounded-2xl glass-panel overflow-hidden p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between z-10">
        <div>
          <h3 className="text-sm font-bold text-white font-mono-tech tracking-wide">
            Skills ↔ Evidence
          </h3>
          <p className="text-xs text-[#9CAAC1]">How skills are proven by real evidence.</p>
        </div>
        <span className="text-xs font-mono-tech text-[#8B5CFF]">GRAPH HEALTHY</span>
      </div>

      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

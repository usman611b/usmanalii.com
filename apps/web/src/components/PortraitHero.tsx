import React, { useEffect, useRef, useState } from 'react';

interface ConstellationNode {
  x: number;
  y: number;
  label: string;
  vx: number;
  vy: number;
  color: string;
}

export const PortraitHero: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Handle subtle pointer parallax (clamped to ~4-8px max)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
    setIsHovered(false);
  };

  // Canvas background constellation (strictly behind right portrait area)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Position nodes exclusively on right side behind portrait
    const nodes: ConstellationNode[] = [
      {
        x: width * 0.58,
        y: height * 0.18,
        label: 'Artifact integrity',
        vx: 0.05,
        vy: -0.05,
        color: '#45F3FF',
      },
      {
        x: width * 0.72,
        y: height * 0.12,
        label: 'Source verification',
        vx: -0.05,
        vy: 0.05,
        color: '#45F3FF',
      },
      {
        x: width * 0.52,
        y: height * 0.65,
        label: 'Decision traceability',
        vx: 0.06,
        vy: 0.03,
        color: '#45F3FF',
      },
      {
        x: width * 0.64,
        y: height * 0.85,
        label: 'Reproducible context',
        vx: -0.05,
        vy: -0.05,
        color: '#45F3FF',
      },
      {
        x: width * 0.88,
        y: height * 0.22,
        label: 'Public record',
        vx: 0.04,
        vy: 0.06,
        color: '#8B5CFF',
      },
      {
        x: width * 0.94,
        y: height * 0.7,
        label: 'Activity validation',
        vx: -0.06,
        vy: -0.04,
        color: '#FF3DA4',
      },
    ];

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connecting lines between nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const pA = nodes[i];
          const pB = nodes[j];
          if (!pA || !pB) continue;
          const dist = Math.hypot(pA.x - pB.x, pA.y - pB.y);
          if (dist < 240) {
            ctx.strokeStyle = `rgba(69, 243, 255, ${0.15 * (1 - dist / 240)})`;
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
          }
        }
      }

      // Render nodes
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < width * 0.5 || node.x > width * 0.96) node.vx *= -1;
        if (node.y < height * 0.08 || node.y > height * 0.92) node.vy *= -1;

        ctx.shadowBlur = 6;
        ctx.shadowColor = node.color;
        ctx.fillStyle = node.color;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#9CAAC1';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(node.label, node.x + 8, node.y + 3);
      });

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Clamped 4-8px pointer movement
  const parallaxX = isHovered ? mousePos.x * 6 : 0;
  const parallaxY = isHovered ? mousePos.y * 6 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full h-[calc(100svh-4rem)] min-h-[640px] max-h-[960px] flex items-center overflow-hidden bg-[#05060A] text-[#F4F1EA] select-none px-4 sm:px-6 lg:px-12"
    >
      {/* Layer 1 & 2: Background Grid & Grain (Left & center stay mostly obsidian) */}
      <div className="absolute inset-0 bg-[#05060A] bg-grid-pattern opacity-30 pointer-events-none z-0" />

      {/* Layer 3: Tight Mesh Gradient Atmosphere behind Right Subject */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-1/4 right-[18%] w-[450px] h-[450px] bg-[#45F3FF]/10 rounded-full blur-[130px] animate-pulse" />
        <div className="absolute bottom-10 right-[8%] w-[420px] h-[420px] bg-[#8B5CFF]/15 rounded-full blur-[150px]" />
        <div className="absolute top-10 right-[2%] w-[320px] h-[320px] bg-[#FF3DA4]/10 rounded-full blur-[110px]" />
      </div>

      {/* Layer 4: Evidence Constellation Canvas (Strictly behind Right Portrait) */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <canvas ref={canvasRef} className="w-full h-full" />
      </div>

      {/* Hero Content Grid: Left Copy 44% / Right Portrait 56% */}
      <div className="relative z-20 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center h-full">
        {/* Left Column: 44% Width Copy & Primary CTAs */}
        <div className="lg:col-span-5 space-y-5 font-mono-tech py-4 z-30">
          {/* Label 1 */}
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-[#08111F] border border-[#45F3FF]/30 text-xs text-[#45F3FF] tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-[#45F3FF] animate-pulse" />
            <span>PERSONAL CAREER OS</span>
          </div>

          {/* Heading 2 — Strictly 1 line on desktop using clamp() and whitespace-nowrap */}
          <div className="space-y-1">
            <h1 className="text-5xl sm:text-6xl lg:text-[clamp(4.5rem,6.5vw,7.5rem)] font-display font-bold uppercase tracking-tight text-white leading-[0.88] whitespace-nowrap">
              USMAN ALI
            </h1>
            <p className="text-2xl sm:text-3xl font-light text-[#F4F1EA] tracking-wide font-sans">
              Engineering, evidenced.
            </p>
          </div>

          {/* Supporting Statement 3 */}
          <p className="text-xs sm:text-sm text-[#9CAAC1] leading-relaxed font-sans max-w-md">
            A living record of what I learn, build, decide, debug, and ship.
          </p>

          {/* Both CTA Buttons 4 */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="/projects"
              className="px-5 py-3 rounded-xl bg-transparent border border-[#45F3FF] text-[#45F3FF] hover:bg-[#45F3FF]/10 font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(69,243,255,0.2)] flex items-center space-x-2"
            >
              <span>→</span>
              <span>Explore my work</span>
            </a>
            <a
              href="/recruiter"
              className="px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-semibold text-xs uppercase tracking-wider transition-all flex items-center space-x-2"
            >
              <span>👁</span>
              <span>Recruiter view</span>
            </a>
          </div>
        </div>

        {/* Right Column: 56% Width Commanding Portrait Area (Anchored to Bottom Edge) */}
        <div className="lg:col-span-7 relative flex justify-center lg:justify-end items-end h-full min-h-[500px]">
          <div
            className="relative w-full max-w-[660px] h-[clamp(560px,78svh,920px)] transition-transform duration-300 ease-out flex items-end justify-center"
            style={{
              transform: `translate3d(${parallaxX}px, ${parallaxY}px, 0px)`,
            }}
          >
            {/* Cyan Rim Glow (Left Silhouette of Portrait) */}
            <div className="absolute top-16 left-6 w-36 h-[72%] bg-[#45F3FF]/30 rounded-full blur-2xl pointer-events-none mix-blend-screen" />

            {/* Magenta/Violet Rim Glow (Right Silhouette of Portrait) */}
            <div className="absolute top-20 right-6 w-40 h-[72%] bg-[#FF3DA4]/30 rounded-full blur-2xl pointer-events-none mix-blend-screen" />

            {/* Faint Offset Shadow Silhouette for Depth */}
            <img
              src="/usman-ali-portrait-transparent-4k.png"
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain object-bottom filter brightness-0 opacity-25 blur-[2.5px] translate-x-3 translate-y-1.5 pointer-events-none"
            />

            {/* Original 4K Transparent Portrait (Substantially Large, Visually Dominant, No Box) */}
            <img
              src="/usman-ali-portrait-transparent-4k.png"
              alt="Usman Ali — Systems Architect & Software Engineer"
              className="relative z-20 w-full h-full object-contain object-bottom drop-shadow-[0_20px_45px_rgba(0,0,0,0.88)] filter contrast-105 select-none"
              loading="eager"
            />

            {/* Restrained Orbital Curve Around Lower Portrait Composition (Below Shoulders) */}
            <svg
              className="absolute bottom-4 -left-8 -right-8 w-[110%] h-[300px] pointer-events-none z-30 opacity-60"
              viewBox="0 0 700 300"
              fill="none"
            >
              <path
                d="M 30,250 C 180,120 520,120 670,250"
                stroke="url(#hero-lower-orbit)"
                strokeWidth="1.5"
                strokeDasharray="5 4"
              />
              <defs>
                <linearGradient id="hero-lower-orbit" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#45F3FF" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#8B5CFF" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#FF3DA4" stopOpacity="0.8" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

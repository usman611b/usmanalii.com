import React, { useEffect, useRef, useState } from 'react';
import { SocialLinks, type SocialProfile } from './SocialLinks';

type PublicProfile = SocialProfile & {
  contactUrl?: string | null;
};

const PORTRAIT_960 = '/usman-ali-portrait-960.webp';
const PORTRAIT_1600 = '/usman-ali-portrait-1600.webp';

const nodes = [
  { x: 58, y: 18, label: 'SYSTEMS THINKING', color: '#25E6FF' },
  { x: 69, y: 34, label: 'DATA MODELS', color: '#25E6FF' },
  { x: 88, y: 22, label: 'DEBUGGING', color: '#8B5CF6' },
  { x: 82, y: 42, label: 'DECISION LOGS', color: '#FF2DAA' },
  { x: 55, y: 66, label: 'ARCHITECTURE', color: '#25E6FF' },
  { x: 91, y: 68, label: 'SHIPPING', color: '#B8FF3D' },
];

export function PortraitHero() {
  const rootRef = useRef<HTMLElement | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);
  const [contactUrl, setContactUrl] = useState<string | null>(null);
  const [socialProfile, setSocialProfile] = useState<SocialProfile>({});

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/v1/public/profile')
      .then(async (response) => (response.ok ? ((await response.json()) as PublicProfile) : null))
      .then((profile) => {
        if (active) {
          setContactUrl(profile?.contactUrl ?? null);
          setSocialProfile(profile ?? {});
        }
      })
      .catch(() => {
        if (active) setContactUrl(null);
      });
    return () => {
      active = false;
    };
  }, []);

  function trackPointer(event: React.PointerEvent<HTMLElement>) {
    if (reducedMotion || event.pointerType === 'touch') return;
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: (event.clientX - rect.left) / rect.width - 0.5,
      y: (event.clientY - rect.top) / rect.height - 0.5,
    });
  }

  return (
    <section
      ref={rootRef}
      className="hero-observatory"
      onPointerMove={trackPointer}
      onPointerLeave={() => setPointer({ x: 0, y: 0 })}
      aria-labelledby="hero-title"
    >
      <div className="hero-grid" aria-hidden="true" />
      <div className="hero-lightfield" aria-hidden="true" />
      <svg className="hero-orbits" viewBox="0 0 1600 900" aria-hidden="true">
        <defs>
          <linearGradient id="orbit" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#25E6FF" stopOpacity="0" />
            <stop offset="0.36" stopColor="#25E6FF" stopOpacity="0.65" />
            <stop offset="0.72" stopColor="#8B5CF6" stopOpacity="0.54" />
            <stop offset="1" stopColor="#FF2DAA" stopOpacity="0.76" />
          </linearGradient>
        </defs>
        <path d="M510 790 C760 520 1260 500 1580 760" stroke="url(#orbit)" />
        <path d="M650 230 C880 70 1270 100 1510 350" stroke="url(#orbit)" opacity=".28" />
      </svg>

      <div className="hero-constellation" aria-hidden="true">
        {nodes.map((node) => (
          <div
            className="hero-node"
            key={node.label}
            style={{ left: `${node.x}%`, top: `${node.y}%`, color: node.color }}
          >
            <span />
            <small>[{node.label}]</small>
          </div>
        ))}
      </div>

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-kicker">
            <span />
            Personal Career OS
          </p>
          <h1 id="hero-title">USMAN ALI</h1>
          <p className="hero-headline">Engineering, evidenced.</p>
          <p className="hero-statement">
            A living record of what I learn, build, decide, debug, and ship.
          </p>
          <div className="hero-actions">
            <a href="/projects" className="hero-primary">
              Explore my work <span aria-hidden="true">→</span>
            </a>
            <a href={contactUrl ?? '#contact'} className="hero-secondary">
              Contact me <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="hero-social" aria-label="Published social profiles" role="group">
            <SocialLinks profile={socialProfile} />
          </div>
        </div>

        <div
          className="hero-portrait-stage"
          style={{
            transform: reducedMotion
              ? undefined
              : `translate3d(${pointer.x * 9}px, ${pointer.y * 6}px, 0)`,
          }}
          aria-hidden="true"
        >
          <div className="portrait-cyan" />
          <div className="portrait-magenta" />
          <img
            className="hero-portrait"
            src={PORTRAIT_1600}
            srcSet={`${PORTRAIT_960} 960w, ${PORTRAIT_1600} 1600w`}
            sizes="(max-width: 900px) 92vw, 54vw"
            alt=""
            width="1600"
            height="1600"
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </div>

      <nav className="hero-section-rail" aria-label="Homepage sections">
        <a href="#overview" aria-current="true">
          Overview
        </a>
        <a href="#evidence-system">Evidence</a>
        <a href="#projects-system">Projects</a>
        <a href="#graph-system">System</a>
        <a href="#contact">Contact</a>
      </nav>
    </section>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { SocialLinks, type SocialProfile } from './SocialLinks';

type PublicProfile = SocialProfile & {
  contactUrl?: string | null;
  contactEmail?: string | null;
};

function resolveContactHref(profile: PublicProfile | null) {
  const contactUrl = profile?.contactUrl?.trim();
  const contactEmail = profile?.contactEmail?.trim();
  if (contactUrl) {
    try {
      const parsed = new URL(contactUrl);
      if (!parsed.username) return contactUrl;
      if (!parsed.password && parsed.pathname === '/') {
        return `mailto:${decodeURIComponent(parsed.username)}@${parsed.hostname}`;
      }
    } catch {
      if (/^mailto:/i.test(contactUrl)) return contactUrl;
    }
  }
  return contactEmail ? `mailto:${contactEmail}` : null;
}

const PORTRAIT_960 = '/usman-ali-portrait-960.webp';
const PORTRAIT_1600 = '/usman-ali-portrait-1600.webp';

const nodes = [
  { x: 58, y: 18, label: 'SYSTEMS THINKING', color: '#25E6FF' },
  { x: 69, y: 34, label: 'DATA MODELS', color: '#25E6FF' },
  { x: 88, y: 22, label: 'DEBUGGING', color: '#8B5CF6' },
  { x: 82, y: 42, label: 'DECISION LOGS', color: '#FF2DAA' },
  { x: 55, y: 66, label: 'ARCHITECTURE', color: '#25E6FF' },
  { x: 91, y: 68, label: 'SHIPPING', color: '#B8FF3D' },
] as const;

const connections = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [3, 5],
  [4, 5],
] as const;

export function PortraitHero() {
  const portraitRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<HTMLDivElement | null>(null);
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
          setContactUrl(resolveContactHref(profile));
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
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    moveLayers(x, y);
  }

  function moveLayers(x: number, y: number) {
    portraitRef.current?.animate(
      { transform: `translate3d(${x * 12}px, ${y * 8}px, 0)` },
      { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
    );
    networkRef.current?.animate(
      { transform: `translate3d(${x * -8}px, ${y * -5}px, 0)` },
      { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' },
    );
  }

  return (
    <section
      className="hero-observatory"
      onPointerMove={trackPointer}
      onPointerLeave={() => moveLayers(0, 0)}
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

      <div ref={networkRef} className="hero-network-parallax" aria-hidden="true">
        <div className="hero-network">
          <svg className="hero-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="hero-network-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#25E6FF" stopOpacity="0.2" />
                <stop offset="0.58" stopColor="#8B5CF6" stopOpacity="0.72" />
                <stop offset="1" stopColor="#FF2DAA" stopOpacity="0.48" />
              </linearGradient>
            </defs>
            {connections.map(([from, to]) => (
              <line
                key={`${from}-${to}`}
                x1={nodes[from].x}
                y1={nodes[from].y}
                x2={nodes[to].x}
                y2={nodes[to].y}
              />
            ))}
          </svg>
          <div className="hero-constellation">
            {nodes.map((node, index) => (
              <div className={`hero-node hero-node--${index + 1}`} key={node.label}>
                <span />
                <small>[{node.label}]</small>
              </div>
            ))}
          </div>
        </div>
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

        <div ref={portraitRef} className="hero-portrait-stage" aria-hidden="true">
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

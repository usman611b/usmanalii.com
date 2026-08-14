import React, { useState, useEffect, useCallback } from 'react';

export type DisplayMode = 'general' | 'recruiter' | 'deep-dive';

interface ModeSwitcherProps {
  initialMode?: DisplayMode;
}

const MODES: Array<{
  id: DisplayMode;
  label: string;
  shortLabel: string;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
}> = [
  {
    id: 'general',
    label: 'General',
    shortLabel: 'General',
    color: 'var(--cyan)',
    borderColor: 'var(--border-cyan)',
    bgColor: 'rgba(37, 230, 255, 0.10)',
    description: 'Narrative and evidence overview',
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    shortLabel: 'Recruiter',
    color: '#A78BFA',
    borderColor: 'var(--border-violet)',
    bgColor: 'rgba(139, 92, 246, 0.10)',
    description: 'Outcome-first 90-second scan',
  },
  {
    id: 'deep-dive',
    label: 'Deep Dive',
    shortLabel: 'Deep',
    color: 'var(--magenta)',
    borderColor: 'var(--border-magenta)',
    bgColor: 'rgba(255, 45, 170, 0.10)',
    description: 'Architecture, ADRs, and provenance',
  },
];

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ initialMode = 'general' }) => {
  const [mode, setMode] = useState<DisplayMode>(initialMode);

  useEffect(() => {
    if (window.location.pathname === '/recruiter') {
      setMode('recruiter');
      return;
    }
    if (window.location.pathname === '/deep-dive') {
      setMode('deep-dive');
      return;
    }
    if (window.location.pathname !== '/') {
      setMode('general');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode') as DisplayMode | null;
    if (urlMode && ['general', 'recruiter', 'deep-dive'].includes(urlMode)) {
      setMode(urlMode);
      return;
    }
  }, []);

  const handleModeChange = useCallback((newMode: DisplayMode) => {
    setMode(newMode);
    document.cookie = `view_mode=${newMode}; path=/; max-age=31536000; SameSite=Lax`;

    if (newMode === 'recruiter') {
      window.location.href = '/recruiter';
    } else if (newMode === 'deep-dive') {
      window.location.href = '/deep-dive';
    } else {
      window.location.href = '/';
    }
  }, []);

  return (
    <div
      className="inline-flex items-center p-0.5 rounded-lg border border-[var(--hairline)] bg-[var(--obsidian)]"
      role="radiogroup"
      aria-label="View Mode Switcher"
    >
      {MODES.map((m) => {
        const isActive = mode === m.id;
        return (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={`Switch to ${m.label} mode — ${m.description}`}
            onClick={() => handleModeChange(m.id)}
            className="px-3 py-1.5 rounded-md text-[11px] font-semibold tracking-wide font-[var(--font-mono)] uppercase transition-all duration-[150ms] whitespace-nowrap"
            style={
              isActive
                ? {
                    background: m.bgColor,
                    color: m.color,
                    border: `1px solid ${m.borderColor}`,
                  }
                : {
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid transparent',
                  }
            }
          >
            {m.shortLabel}
          </button>
        );
      })}
    </div>
  );
};

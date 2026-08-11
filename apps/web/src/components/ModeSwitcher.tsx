import React, { useState, useEffect } from 'react';

export type DisplayMode = 'general' | 'recruiter' | 'deep-dive';

interface ModeSwitcherProps {
  initialMode?: DisplayMode;
}

export const ModeSwitcher: React.FC<ModeSwitcherProps> = ({ initialMode = 'general' }) => {
  const [mode, setMode] = useState<DisplayMode>(initialMode);

  useEffect(() => {
    // Read from URL param if present
    const params = new URLSearchParams(window.location.search);
    const urlMode = params.get('mode') as DisplayMode | null;
    if (urlMode && ['general', 'recruiter', 'deep-dive'].includes(urlMode)) {
      setMode(urlMode);
    } else {
      // Read from cookie
      const match = document.cookie.match(/view_mode=(general|recruiter|deep-dive)/);
      if (match && match[1]) {
        setMode(match[1] as DisplayMode);
      }
    }
  }, []);

  const handleModeChange = (newMode: DisplayMode) => {
    setMode(newMode);
    document.cookie = `view_mode=${newMode}; path=/; max-age=31536000; SameSite=Lax`;

    // Navigate to appropriate surface or update URL
    if (newMode === 'recruiter') {
      window.location.href = '/recruiter';
    } else if (newMode === 'deep-dive') {
      window.location.href = '/deep-dive';
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div
      className="inline-flex items-center p-0.5 bg-[#08111F] rounded-lg border border-white/10 text-xs font-medium font-mono-tech"
      role="radiogroup"
      aria-label="View Mode Switcher"
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === 'general'}
        onClick={() => handleModeChange('general')}
        className={`px-3 py-1 rounded-md transition-all duration-200 ${
          mode === 'general'
            ? 'bg-[#45F3FF]/15 text-[#45F3FF] border border-[#45F3FF]/30 font-semibold shadow-sm'
            : 'text-[#9CAAC1] hover:text-white'
        }`}
      >
        General
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={mode === 'recruiter'}
        onClick={() => handleModeChange('recruiter')}
        className={`px-3 py-1 rounded-md transition-all duration-200 ${
          mode === 'recruiter'
            ? 'bg-[#8B5CFF]/15 text-[#8B5CFF] border border-[#8B5CFF]/30 font-semibold shadow-sm'
            : 'text-[#9CAAC1] hover:text-white'
        }`}
      >
        Recruiter
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={mode === 'deep-dive'}
        onClick={() => handleModeChange('deep-dive')}
        className={`px-3 py-1 rounded-md transition-all duration-200 ${
          mode === 'deep-dive'
            ? 'bg-[#FF3DA4]/15 text-[#FF3DA4] border border-[#FF3DA4]/30 font-semibold shadow-sm'
            : 'text-[#9CAAC1] hover:text-white'
        }`}
      >
        Deep Dive
      </button>
    </div>
  );
};

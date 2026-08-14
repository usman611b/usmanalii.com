/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // M8 Canonical Palette — mirrors CSS custom properties in global.css
        canvas:   '#030507',
        obsidian: '#070B12',
        midnight: '#0B1220',
        elevated: '#101929',
        'surface-quiet': '#0D1525',
        'surface-card':  '#111f36',

        // Text
        'text-primary':   '#F8FAFC',
        'text-secondary': '#B6C2D1',
        'text-muted':     '#7D899A',

        // Semantic accents
        cyan:    '#25E6FF',
        violet:  '#8B5CF6',
        magenta: '#FF2DAA',
        lime:    '#B8FF3D',
        amber:   '#FFB547',
        danger:  '#FF5470',
      },
      fontFamily: {
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
        primary: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      borderRadius: {
        xs:   '4px',
        sm:   '6px',
        md:   '8px',
        lg:   '14px',
        xl:   '20px',
        '2xl': '28px',
        pill: '9999px',
      },
      spacing: {
        // 4px base scale — do not add arbitrary values
        1:  '4px',
        2:  '8px',
        3:  '12px',
        4:  '16px',
        6:  '24px',
        8:  '32px',
        12: '48px',
        16: '64px',
        24: '96px',
        32: '128px',
      },
      transitionDuration: {
        instant: '80ms',
        fast:    '150ms',
        normal:  '220ms',
        slow:    '350ms',
        xslow:   '500ms',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      animation: {
        'mesh-drift':     'mesh-drift 45s ease-in-out infinite',
        'particle-float': 'particle-float 8s ease-in-out infinite',
        'orbital-pulse':  'orbital-pulse 3s ease-in-out infinite',
        'fade-up':        'fade-up 350ms ease both',
        'fade-in':        'fade-in 220ms ease both',
        'skeleton':       'skeleton-shimmer 1.6s ease-in-out infinite',
        'status-pulse':   'status-pulse 2s ease-in-out infinite',
      },
      maxWidth: {
        reading: '68ch',
        content: '1280px',
        wide:    '1440px',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};

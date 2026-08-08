/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#050509',
        midnight: '#080D1A',
        elevated: '#0D1528',
        'surface-high': '#101A31',
        foreground: '#F7FBFF',
        muted: '#9CAAC1',
        'cyber-cyan': '#22D3EE',
        'electric-violet': '#8B5CF6',
        'hot-magenta': '#EC4899',
        'acid-lime': '#B6F43A',
        'signal-blue': '#3B82F6',
      },
    },
  },
  plugins: [],
};

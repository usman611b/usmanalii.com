/**
 * Design System Tokens — M8 Visual Transformation
 *
 * Single source of truth for the visual system.
 * Values must be consumed from these tokens, not ad-hoc utilities.
 *
 * Aligned with:
 *  - global.css custom properties (CSS layer)
 *  - tailwind.config.mjs (Tailwind utilities)
 *  - M8 color system (§4 of the M8 brief)
 *
 * Token discipline:
 *  - 80% neutral dark surfaces
 *  - 15% restrained cool atmospheric light
 *  - 5% high-energy accent
 *  - Only ONE dominant accent should lead a viewport
 */

// ---------------------------------------------------------------------------
// Color Tokens — M8 Specification (§4)
// ---------------------------------------------------------------------------

export const colorTokens = {
  // Canvas & Surfaces
  canvas: '#030507', // Page foundation (body)
  obsidian: '#070B12', // Deepest layered background
  midnight: '#0B1220', // Reading and navigation surfaces
  elevated: '#101929', // Cards and elevated panels
  surfaceQuiet: '#0D1525', // Quiet separation, no blur
  surfaceCard: '#111f36', // Interactive card elevation

  // Text hierarchy
  textPrimary: '#F8FAFC', // Warm white — main body text
  textSecondary: '#B6C2D1', // Cool gray — secondary labels
  textMuted: '#7D899A', // Dimmed — metadata, timestamps
  textInverse: '#030507', // On-accent text (e.g. on cyan buttons)

  // Borders
  hairline: 'rgba(148, 163, 184, 0.12)', // Default border
  hairlineStrong: 'rgba(148, 163, 184, 0.24)', // Hovered/focused border

  // Semantic Accents — node types in constellation
  cyan: '#25E6FF', // Evidence, verification, exploration
  violet: '#8B5CF6', // Decisions, ADRs, intelligence
  magenta: '#FF2DAA', // Experiments, exploration, focus
  lime: '#B8FF3D', // Shipped outcomes, healthy states
  amber: '#FFB547', // Lessons, stale evidence, pending
  danger: '#FF5470', // Errors, broken, destructive actions

  // Tinted accent borders (rgba wrappers)
  borderCyan: 'rgba(37, 230, 255, 0.20)',
  borderViolet: 'rgba(139, 92, 246, 0.20)',
  borderMagenta: 'rgba(255, 45, 170, 0.20)',
  borderLime: 'rgba(184, 255, 61, 0.20)',
  borderAmber: 'rgba(255, 181, 71, 0.20)',
  borderDanger: 'rgba(255, 84, 112, 0.20)',
} as const;

export type ColorToken = keyof typeof colorTokens;

// ---------------------------------------------------------------------------
// Constellation / Graph Node Colors
// Each evidence type has a stable color identity.
// ---------------------------------------------------------------------------

export const constellationColors = {
  evidence: colorTokens.cyan, // Evidence items
  decision: colorTokens.violet, // Decisions and ADRs
  experiment: colorTokens.magenta, // Experiments
  outcome: colorTokens.lime, // Projects and shipped outcomes
  lesson: colorTokens.amber, // Debugging lessons
  revoked: colorTokens.danger, // Revoked/disputed/stale
  default: colorTokens.textMuted,
} as const;

// ---------------------------------------------------------------------------
// Typography Tokens
// ---------------------------------------------------------------------------

export const typographyTokens = {
  fontDisplay: "'Bebas Neue', 'Impact', sans-serif",
  fontPrimary: "'Inter', system-ui, -apple-system, sans-serif",
  fontMono: "'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",

  // Responsive sizes using clamp()
  heroSize: 'clamp(3.5rem, 8vw, 7.5rem)',
  sectionSize: 'clamp(2rem, 5vw, 4rem)',
  cardTitleSize: '1.2rem',
  bodySize: '1rem',
  smallSize: '0.875rem',
  metadataSize: '0.75rem', // never below 12px rendered

  // Line heights
  heroLineHeight: '0.90',
  bodyLineHeight: '1.60',
  tightLineHeight: '1.20',

  // Reading measure
  readingWidth: '68ch',

  // Weights
  weights: [400, 500, 600, 700] as const,
} as const;

// ---------------------------------------------------------------------------
// Spacing Tokens — 4px base unit
// ---------------------------------------------------------------------------

export const spacingTokens = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
  24: '96px',
  32: '128px',
} as const;

// ---------------------------------------------------------------------------
// Border Radius Tokens
// ---------------------------------------------------------------------------

export const radiusTokens = {
  xs: '4px', // Tag corners
  sm: '6px', // Small controls
  md: '8px', // Inputs, buttons
  lg: '14px', // Cards, panels
  xl: '20px', // Feature surfaces
  '2xl': '28px', // Hero containers
  pill: '9999px', // Pills and dots
} as const;

// ---------------------------------------------------------------------------
// Motion Tokens
// ---------------------------------------------------------------------------

export const motionTokens = {
  // Duration ranges
  instant: '80ms',
  fast: '150ms',
  normal: '220ms',
  slow: '350ms',
  xslow: '500ms',

  // Ambient
  meshCycle: '45s',
  particleDrift: '8s',

  // Easing
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',

  // Interaction limits
  cardTiltMax: '2deg',
  cardLiftMin: '2px',
  cardLiftMax: '6px',
  cardPerspective: '1000px',
  scrollRevealDisplacement: '18px',
  hoverTiltMax: '2deg',

  // Canvas performance
  maxDevicePixelRatio: 1.5,
} as const;

// ---------------------------------------------------------------------------
// Z-Index Scale
// ---------------------------------------------------------------------------

export const zIndexTokens = {
  base: 0,
  raised: 10,
  card: 20,
  dropdown: 100,
  nav: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
} as const;

// ---------------------------------------------------------------------------
// Layout Tokens
// ---------------------------------------------------------------------------

export const layoutTokens = {
  readingWidth: '68ch',
  contentMax: '1280px',
  contentWide: '1440px',
  bentoColumns: 12, // 12-column desktop grid
  bentoTablet: 6, // 6-column tablet
  bentoMobile: 1, // single-column mobile
} as const;

// ---------------------------------------------------------------------------
// Gradient Definitions
// ---------------------------------------------------------------------------

export const gradientTokens = {
  // Large hero: cyan → violet → magenta
  hero: `linear-gradient(135deg, ${colorTokens.cyan}, ${colorTokens.violet}, ${colorTokens.magenta})`,
  // Evidence: cyan → blue → violet
  evidence: `linear-gradient(135deg, ${colorTokens.cyan}, #3b82f6, ${colorTokens.violet})`,
  // Delivery / success: cyan → lime
  delivery: `linear-gradient(135deg, ${colorTokens.cyan}, ${colorTokens.lime})`,
  // Atmospheric spine: cyan → violet → magenta
  spine: `linear-gradient(to bottom, transparent, ${colorTokens.borderCyan} 10%, ${colorTokens.borderViolet} 50%, ${colorTokens.borderMagenta} 90%, transparent)`,
} as const;

// ---------------------------------------------------------------------------
// Surface System
// Four explicit elevation levels
// ---------------------------------------------------------------------------

export const surfaceTokens = {
  canvas: { background: colorTokens.canvas, border: 'none' },
  quiet: { background: colorTokens.surfaceQuiet, border: colorTokens.hairline },
  card: { background: colorTokens.surfaceCard, border: colorTokens.hairline },
  overlay: { background: 'rgba(7, 11, 18, 0.92)', border: colorTokens.hairline, blur: '16px' },
} as const;

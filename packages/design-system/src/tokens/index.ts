/**
 * Design system tokens — derived from UI/UX Specification §4.
 *
 * These tokens are the single source of truth for the visual system.
 * All values must come from these tokens — not ad-hoc utilities.
 *
 * TOKEN SYSTEM:
 *  - Colors: defined as CSS custom properties + Tailwind config
 *  - Typography: Geist (primary) + Geist Mono (technical)
 *  - Spacing: 4px base unit
 *  - Motion: spring-based, respects prefers-reduced-motion
 *
 * UI/UX Specification §4 (Design tokens).
 */

// ---------------------------------------------------------------------------
// Color tokens
// ---------------------------------------------------------------------------

export const colorTokens = {
  // Foundation
  obsidian: '#05060A', // Page foundation
  deepCanvas: '#070A11', // Layered background canvas
  midnight: '#08111F', // Reading and navigation surfaces
  elevatedNavy: '#0C1626', // Cards and elevated panels
  surfaceHigh: '#101F38', // Interactive elevation

  // Text
  foreground: '#F4F1EA', // Warm white primary text
  muted: '#9CAAC1', // Cool gray secondary text

  // Semantic accents
  cyberCyan: '#45F3FF', // System exploration & navigation
  electricViolet: '#8B5CFF', // Knowledge & decisions
  hotMagenta: '#FF3DA4', // Major actions & focus points
  acidLime: '#B8FF5A', // Verified & healthy states
  signalBlue: '#3B82F6', // Navigation & info

  // Status
  warningAmber: '#F59E0B', // Pending review / stale evidence
  errorRed: '#F43F5E', // Errors and destructive actions
} as const;

export type ColorToken = keyof typeof colorTokens;

// ---------------------------------------------------------------------------
// Typography tokens
// ---------------------------------------------------------------------------

export const typographyTokens = {
  fontDisplay: '"Bebas Neue", "Oswald", "Outfit", sans-serif',
  fontPrimary: '"Geist", "Inter", system-ui, sans-serif',
  fontTechnical: '"Geist Mono", "IBM Plex Mono", monospace',

  // Sizes — clamp() for responsive scaling
  hero: 'clamp(3.5rem, 9vw, 8rem)',
  sectionTitle: 'clamp(2.25rem, 5vw, 4.5rem)',
  cardTitle: '1.2rem', // up to 2rem via responsive
  body: '1rem', // 1–1.125rem
  metadata: '0.75rem', // never below 12px rendered

  // Line heights
  heroLineHeight: '0.92',
  bodyLineHeight: '1.6',

  // Weights used selectively
  weights: [400, 500, 600, 700] as const,

  // Reading line length
  readingWidth: '65ch', // 65–75 character measure
} as const;

// ---------------------------------------------------------------------------
// Spacing tokens — 4px base unit
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
// Border radius tokens
// ---------------------------------------------------------------------------

export const radiusTokens = {
  card: '16px', // 16–24px for cards
  cardLg: '24px',
  control: '10px', // 10–14px for compact controls
  controlLg: '14px',
} as const;

// ---------------------------------------------------------------------------
// Motion tokens
// ---------------------------------------------------------------------------

export const motionTokens = {
  // Duration ranges
  orientationMin: '180ms',
  orientationMax: '450ms',
  feedbackDuration: '100ms',

  // Card tilt
  cardTiltMax: '5deg',
  cardLiftMin: '4px',
  cardLiftMax: '8px',
  cardPerspective: '1000px',

  // Easing
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// ---------------------------------------------------------------------------
// Gradient definitions
// ---------------------------------------------------------------------------

export const gradientTokens = {
  // Large gradients: cyan → violet → magenta
  hero: `linear-gradient(135deg, ${colorTokens.cyberCyan}, ${colorTokens.electricViolet}, ${colorTokens.hotMagenta})`,
  // Evidence gradients: cyan → blue → violet
  evidence: `linear-gradient(135deg, ${colorTokens.cyberCyan}, ${colorTokens.signalBlue}, ${colorTokens.electricViolet})`,
  // Delivery gradients: cyan → lime
  delivery: `linear-gradient(135deg, ${colorTokens.cyberCyan}, ${colorTokens.acidLime})`,
} as const;

// ---------------------------------------------------------------------------
// Layout tokens
// ---------------------------------------------------------------------------

export const layoutTokens = {
  readingWidth: '680px', // 680–760px reading width
  contentMax: '1280px', // 1280–1440px general content max
  bentoColumns: 12, // 12-column desktop bento grid
  bentoTablet: 6, // 6-column tablet
  bentoMobile: 1, // single-column mobile
} as const;

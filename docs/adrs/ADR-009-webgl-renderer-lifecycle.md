# ADR-009: WebGL Renderer Lifecycle and Fallback Policy

**Status:** Decided
**Date:** 2026-08-08
**Depends on:** UI/UX Specification §7, Technical Architecture §17

---

## Context

The homepage Evidence Core uses Three.js / React Three Fiber. The renderer must not block content, violate performance budgets or drain mobile battery.

## Decision

**Renderer lifecycle:**

1. Primary content (hero text, navigation, CTA) renders as static HTML before WebGL.
2. Three.js bundle loads only on the homepage (lazy-loaded React island client:visible).
3. IntersectionObserver pauses rendering when the canvas is off-screen.
4. isibilitychange event stops the render loop when the tab is hidden.
5. On unmount, geometry and materials are disposed to prevent memory leaks.
6. Device pixel ratio clamped to Math.min(devicePixelRatio, 2).

**Fallbacks (in priority order):**

1. CSS mesh-gradient static background always present (loads before WebGL).
2. WebGL unavailable: CSS Evidence Core diagram with same five-pillar relationship.
3. prefers-reduced-motion: Three.js not loaded; static gradient only.
4. prefers-reduced-data / Save-Data header: no 3D preload; explicit activation only.
5. No JavaScript: static HTML five-pillar representation.

**One canvas maximum per page.**

## Consequences

- LCP not blocked by WebGL (content-first)
- Mobile thermal budget protected
- Performance budgets met: public shell <150KB compressed JS excluding lazy 3D

# MOTION AND 3D SPECIFICATION — usmanalii.com

> Engineering rules for ambient animations, pointer parallax, depth layering, performance caps, and accessibility overrides.

---

## 1. Core Principles

1. **Purpose-Driven**: Motion is for visual hierarchy, spatial depth, and state feedback — never decorative noise.
2. **Performance-First**: Frame budgets are strictly enforced (60fps on 1x DPR, 45fps on high-DPR mobile).
3. **Respect Preferences**: Continuous animations immediately stop under `prefers-reduced-motion: reduce` or `document.visibilityState === 'hidden'`.

---

## 2. Portrait Hero 3D Depth Stack

The homepage hero constructs a multi-layer spatial depth stack:

```
Layer 7 [z-index: 35]: Sparse foreground floating particles (HTML divs)
Layer 6 [z-index: 30]: Orbital arc SVG (dashed gradient path behind portrait)
Layer 5d [z-index: 20]: Primary portrait image (transparent PNG)
Layer 5c [z-index: 18]: Shadow silhouette copy (offset 4px 3px, blur 3px)
Layer 5b [z-index: 16]: Violet/magenta right rim light glow (blur 32px)
Layer 5a [z-index: 14]: Cyan left rim light glow (blur 28px)
Layer 4 [z-index: 10]: Hero grid layout container
Layer 3 [z-index: 2] : Constellation Canvas (HTML5 Canvas 2D)
Layer 2 [z-index: 1] : Mesh lightfield atmospheric gradients (blur 60-80px)
Layer 1 [z-index: 0] : Blueprint grid background (CSS background-image)
```

---

## 3. Pointer Parallax Physics

- **Mouse Movement**: Computed relative to container center (`-0.5` to `+0.5`).
- **Translation Max**: Clamped strictly to `6px` maximum displacement.
- **Easing**: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (`var(--ease-smooth)`).
- **Touch Devices**: Parallax disabled automatically (uses static alignment).

---

## 4. Constellation Canvas Engine (`PortraitHero.tsx`)

- **Rendering**: HTML5 2D Canvas context.
- **Device Pixel Ratio (DPR)**: Clamped to `Math.min(window.devicePixelRatio, 1.5)` to prevent GPU memory pressure on 4K / Retina displays.
- **Node Physics**: 7 floating evidence/decision nodes with velocity vectors (`vx`, `vy`) bounded to right half of viewport.
- **Connection Lines**: Distance threshold `< 220px`, alpha scaled dynamically `0.12 * (1 - dist/220)`.
- **Tab Visibility Handler**:
  ```ts
  document.addEventListener('visibilitychange', () => {
    isPageVisible.current = document.visibilityState === 'visible';
  });
  ```
  When `isPageVisible.current === false`, `render()` returns early without requesting new frames.

---

## 5. CSS Ambient Keyframes

```css
/* Atmospheric gradient drift */
@keyframes mesh-drift {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  50% {
    transform: translate(-30px, 20px) scale(1.08);
  }
}

/* Foreground particle float */
@keyframes particle-float {
  0%,
  100% {
    transform: translateY(0) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translateY(-18px) scale(1.3);
    opacity: 0.8;
  }
}

/* Hero orbital arc pulse */
@keyframes orbital-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 0.75;
  }
}

/* Status indicator dot pulse */
@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    transform: scale(0.85);
  }
}
```

---

## 6. Motion Budget & Limits

| Constraint      | Maximum Allowed  | Enforcement                              |
| --------------- | ---------------- | ---------------------------------------- |
| Parallax offset | `6px`            | `mousePos.x * 6` hardcoded clamp         |
| Canvas DPR      | `1.5`            | `Math.min(window.devicePixelRatio, 1.5)` |
| Card tilt       | `2deg`           | CSS transform hover max                  |
| Frame duration  | `16.6ms` (60fps) | Simple 2D canvas primitives              |
| Hidden tab CPU  | `0%`             | `visibilitychange` loop pause            |

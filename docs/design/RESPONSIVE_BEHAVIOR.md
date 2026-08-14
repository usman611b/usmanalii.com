# RESPONSIVE BEHAVIOR SPECIFICATION — usmanalii.com

> Layout adaptations, touch targets, container boundaries, and view-mode shifts across mobile, tablet, and desktop viewports.

---

## 1. Viewport Matrix

| Parameter           | Mobile (`< 768px`)       | Tablet (`768px – 1279px`) | Desktop (`1280px+`)            |
| ------------------- | ------------------------ | ------------------------- | ------------------------------ |
| Container max-width | `100%`                   | `768px – 1200px`          | `1280px`                       |
| Grid columns        | 1 column                 | 6 columns                 | 12 columns (Bento)             |
| Horizontal padding  | `16px` (`px-4`)          | `24px` (`px-6`)           | `32px`–`48px` (`px-8`–`px-12`) |
| Navigation          | Full-screen glass sheet  | Top sticky glass nav      | Top sticky glass nav           |
| Command Center Nav  | Hamburger overlay drawer | Left rail (collapsible)   | Persistent left rail (`w-56`)  |
| Touch Target Min    | `44 × 44px`              | `40 × 40px`               | `36 × 36px`                    |

---

## 2. Component Adaptations

### Navigation (`Navigation.astro`)

- **Desktop (`≥ 768px`)**: Inline links + Mode Switcher aligned right.
- **Mobile (`< 768px`)**: Hamburger toggle button (`id="mobile-menu-btn"`, `44×44px`). Opens full-screen overlay sheet (`z-[300]`) with focus trap, body scroll lock, and Escape key listener.

### Hero Section (`PortraitHero.tsx`)

- **Desktop (`≥ 1024px`)**: 5-column left copy + 7-column right portrait with live constellation canvas, depth shadows, rim lighting, and subtle mouse parallax (max 6px).
- **Tablet (`768px – 1023px`)**: Stacked layout; portrait height clamped to `50svh`, constellation canvas simplified.
- **Mobile (`< 768px`)**: Stacked vertically; portrait at top (`360px` max), text and CTAs full width below. Parallax disabled for touch performance.

### Evidence Directory (`PublicRecordDirectory.tsx`)

- **Desktop**: 2-column grid (`md:grid-cols-2`) with hover glow borders (`border-cyan`/`border-violet`).
- **Mobile**: 1-column stack with generous vertical spacing (`gap-4`).

### Skills Evidence Graph (`SkillsEvidenceGraph.tsx`)

- **Desktop**: Interactive SVG graph canvas + category selector + accessible table toggle.
- **Mobile**: SVG graph auto-scales via `viewBox="0 0 100 100"`. Accessible table toggle button easily reachable at top.

### Activity Heatmap (`ActivityHeatmap.tsx`)

- **Desktop**: 52-week horizontal grid (`min-width: 700px`).
- **Mobile**: Scrollable horizontal container with visible scroll indicator; tooltip pinned to bottom.

---

## 3. Touch & Keyboard Targets

- **Primary Buttons (`.btn`)**: `min-height: 44px` on mobile, `40px` on desktop.
- **Links in text**: `padding: 4px 0` to increase tap target area.
- **Form Selects & Inputs**: `min-height: 44px` on touch screens.
- **Focus Rings**: `focus-visible` ring `2px solid var(--cyan)` with `3px` offset on all interactive elements.

---

## 4. Reduced-Motion Adaptation

When `prefers-reduced-motion: reduce` is active:

1. CSS rule in `global.css` overrides all animation and transition durations to `0.01ms !important`.
2. Canvas animation loops (`requestAnimationFrame`) in `PortraitHero.tsx` automatically halt.
3. Card tilt and parallax offsets are forced to `translate3d(0,0,0)`.
